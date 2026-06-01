"""OrchestratorV2 - the main phase-based orchestrator. It owns the session
lifecycle and routes each user message through the specialized agents below."""

import json
import time
import threading
from datetime import datetime
from sqlalchemy.orm import Session
from models import Provider, Booking, User, ChatSession, ChatMessage, Notification
from .llm import _call_llm, log
from .common import MAX_RECENT_MESSAGES, SERVICE_CATALOG, PHASE_GATHERING, PHASE_SELECTING, PHASE_CONFIRMING, PHASE_CANCELLING, PHASE_COMPLETED, AgentExecutionLog, _build_windowed_context
from .intent_validation import IntentValidationAgent
from .provider_discovery import ProviderDiscoveryAgent
from .smart_match import SmartMatchAgent
from .booking_confirmation import BookingConfirmationAgent
from .cancellation import CancellationAgent
from .orchestrator_agent import OrchestratorAgent
from .concierge import ConciergeAgent
from .chat_summarizer import ChatSummarizerAgent


class OrchestratorV2:
    """Phase-based orchestrator. Session stays active until completed.

    Phases:
        gathering_intent -> selecting_provider -> confirming_booking -> completed
        gathering_intent -> cancelling_booking -> completed  (cancellation flow)
    """

    def __init__(self):
        self.intent_agent = IntentValidationAgent()
        self.discovery_agent = ProviderDiscoveryAgent()
        self.smart_match_agent = SmartMatchAgent()
        self.booking_agent = BookingConfirmationAgent()
        self.cancellation_agent = CancellationAgent()
        self.orchestrator_agent = OrchestratorAgent()
        self.concierge_agent = ConciergeAgent()

    # --- Session helpers ---

    def _get_or_create_session(self, session_id: int, user_id: int, db: Session) -> ChatSession:
        if session_id:
            session = db.query(ChatSession).filter(
                ChatSession.id == session_id,
                ChatSession.status == "active"
            ).first()
            if session:
                return session
        session = ChatSession(user_id=user_id, status="active")
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def _load_messages(self, session: ChatSession) -> list:
        return [{"role": msg.role, "content": msg.content} for msg in session.messages]

    def _save_message(self, session: ChatSession, role: str, content: str, db: Session,
                      state: dict = None, extra_data: dict = None):
        msg = ChatMessage(
            session_id=session.id,
            role=role,
            content=content,
            state_snapshot=json.dumps(state) if state else None,
            extra_data=json.dumps(extra_data) if extra_data else None,
        )
        db.add(msg)
        db.commit()

    def _get_state(self, session: ChatSession) -> dict:
        try:
            return json.loads(session.extracted_state) if session.extracted_state else {}
        except (json.JSONDecodeError, TypeError):
            return {}

    def _save_state(self, session: ChatSession, state: dict, db: Session):
        session.extracted_state = json.dumps(state)
        db.commit()

    # --- Response builder ---

    def _build_response(self, reply, language, phase, session_id, state, logger,
                        providers=None, booking_summary=None, booking_id=None,
                        requires_location=False, cancel_bookings=None, notification=None):
        # Map internal cancellation phase to gathering_intent for FE compatibility
        external_phase = PHASE_GATHERING if phase == PHASE_CANCELLING else phase
        # Build a FE-safe copy of state (strip internal cancel data — sent as top-level fields)
        fe_state = dict(state)
        if fe_state.get("phase") == PHASE_CANCELLING:
            fe_state["phase"] = PHASE_GATHERING
        fe_state.pop("cancel_bookings", None)
        fe_state.pop("cancel_booking_id", None)
        fe_state.pop("cancel_phase", None)
        return {
            "reply": reply,
            "language": language,
            "phase": external_phase,
            "requires_location": requires_location,
            "session_id": session_id,
            "state": fe_state,
            "providers": providers,
            "booking_summary": booking_summary,
            "booking_id": booking_id,
            "cancel_bookings": cancel_bookings,
            "notification": notification,
            "debug_logs": logger.logs,
        }

    # --- Main entry ---

    def process_chat(self, message: str, user_id: int, db: Session, session_id: int = None,
                     latitude: float = None, longitude: float = None, location_name: str = None,
                     selected_provider_id: int = None, selected_slot: str = None, selected_date: str = None,
                     selected_cancel_booking_id: int = None):
        logger = AgentExecutionLog()

        try:
            return self._route(message, user_id, db, session_id, latitude, longitude, location_name,
                               selected_provider_id, selected_slot, selected_date,
                               selected_cancel_booking_id, logger)
        except Exception as e:
            log.error(f"Orchestrator error: {str(e)[:150]}")
            return self._build_response(
                "Something went wrong (free API Quota got exhausted). Please try again.", "english",
                PHASE_GATHERING, session_id, {}, logger
            )
        finally:
            # One rollup line per chat request: total LLM calls, tokens, and cost.
            logger.log_llm_summary()

    def _route(self, message, user_id, db, session_id, latitude, longitude, location_name,
               selected_provider_id, selected_slot, selected_date,
               selected_cancel_booking_id, logger):
        user = db.query(User).filter(User.id == user_id).first() if user_id else None
        # A stale/unknown user_id must not reach a ChatSession insert: Postgres enforces
        # the users FK (SQLite didn't), so it would raise ForeignKeyViolation. Degrade to
        # an anonymous session (user_id is nullable) instead of 500-ing the request.
        if user_id and not user:
            log.warning(f"user_id={user_id} not found in DB; creating an anonymous session.")
            user_id = None
        session = self._get_or_create_session(session_id, user_id, db)
        state = self._get_state(session)
        phase = state.get("phase", PHASE_GATHERING)
        language = state.get("language", "english")

        # Store location if provided
        if latitude and longitude:
            state["latitude"] = latitude
            state["longitude"] = longitude
            if location_name:
                state["location_name"] = location_name
            state.pop("location_override", None)
            self._save_state(session, state, db)
            # Also update user profile for future sessions
            if user and (not user.latitude or not user.longitude):
                user.latitude = latitude
                user.longitude = longitude
                if location_name:
                    user.location = location_name
                db.commit()

        if message:
            self._save_message(session, "user", message, db, state=state)

        # --- Orchestrator Agent: decide the lane for this turn (agentic top-level router) ---
        # Skip for structured FE actions (provider/cancel taps) — those are explicit flow steps.
        if message and not selected_provider_id and not selected_cancel_booking_id:
            recent = self._load_messages(session)[-MAX_RECENT_MESSAGES:]
            decision = self.orchestrator_agent.route(recent, state, phase, logger)
            if decision.get("next_action") == "answer_question":
                return self._handle_general_query(
                    session, user, state, phase, decision.get("language"), db, logger
                )

        # Detect location change request in non-gathering phases via LLM (skip during cancellation)
        if message and phase not in (PHASE_GATHERING, PHASE_CANCELLING) and self._detect_location_change_intent(message):
            state.pop("latitude", None)
            state.pop("longitude", None)
            state.pop("location_name", None)
            state.pop("providers", None)
            state.pop("shown_provider_ids", None)
            state.pop("booking_summary", None)
            state["location_override"] = True
            state["phase"] = PHASE_GATHERING
            self._save_state(session, state, db)
            location_reply = self._requires_location_reply(language)
            self._save_message(session, "assistant", location_reply, db,
                               state=state, extra_data={"requires_location": True, "reason": "user_requested_change"})
            return self._build_response(location_reply, language, PHASE_GATHERING, session.id,
                                        state, logger, requires_location=True)
        log.info(f"Session {session.id} | Phase: {phase} | Provider selection: {selected_provider_id} | Location: {bool(state.get('latitude'))}")

        # --- Route based on phase ---

        # If location was just provided and intent is already complete, skip to discovery
        if phase == PHASE_GATHERING and latitude and longitude:
            intent_complete = (
                state.get("service_type") and state["service_type"] != "Unknown"
                and state.get("booking_date")
            )
            if intent_complete:
                language = state.get("language", "english")
                state["phase"] = PHASE_SELECTING
                self._save_state(session, state, db)
                return self._discover_and_respond(session, user, state, language, db, logger)

        if phase == PHASE_GATHERING:
            return self._handle_gathering(session, user, state, db, logger)

        elif phase == PHASE_SELECTING:
            if selected_provider_id and selected_slot and selected_date:
                return self._handle_provider_selected(
                    session, user, state, selected_provider_id, selected_slot, selected_date, db, logger
                )
            elif message:
                return self._handle_message_during_selection(session, user, state, message, db, logger)
            else:
                return self._reshow_providers(session, state, language, db, logger)

        elif phase == PHASE_CONFIRMING:
            return self._handle_confirming(session, user, state, message, db, logger)

        elif phase == PHASE_CANCELLING:
            if selected_cancel_booking_id:
                return self._handle_cancel_booking_selected(session, user, state, selected_cancel_booking_id, db, logger)
            return self._handle_cancellation_message(session, user, state, message, db, logger)

        elif phase == PHASE_COMPLETED:
            return self._handle_completed_restart(session, user, state, message, user_id, db, logger)

        return self._handle_gathering(session, user, state, db, logger)

    # --- General query (off-script question, any phase) ---

    def _handle_general_query(self, session, user, state, phase, language, db, logger):
        """Answer an off-script general question without leaving the current phase.

        The Concierge replies, then we re-attach the phase-appropriate data so the
        FE keeps its current view (provider list / booking summary / cancel list).
        """
        language = language or state.get("language", "english")
        recent = self._load_messages(session)[-MAX_RECENT_MESSAGES:]
        result = self.concierge_agent.answer(recent, state, phase, language, db, logger)
        reply = result.get("reply")
        language = result.get("language", language)

        self._save_message(session, "assistant", reply, db, state=state,
                           extra_data={"action": "answer_question", "phase": phase})

        providers = state.get("providers") if phase == PHASE_SELECTING else None
        booking_summary = state.get("booking_summary") if phase == PHASE_CONFIRMING else None
        cancel_bookings = state.get("cancel_bookings") if phase == PHASE_CANCELLING else None

        return self._build_response(
            reply, language, phase, session.id, state, logger,
            providers=providers, booking_summary=booking_summary,
            cancel_bookings=cancel_bookings,
        )

    # --- Phase: gathering_intent ---

    def _handle_gathering(self, session, user, state, db, logger):
        all_messages = self._load_messages(session)
        windowed_messages, context_summary, summary_updated = _build_windowed_context(
            all_messages, session.context_summary
        )
        if summary_updated and context_summary:
            session.context_summary = context_summary
            db.commit()

        intent_result = self.intent_agent.process(windowed_messages, user, state, context_summary, logger)

        is_valid = intent_result.get("is_valid", True)
        is_complete = intent_result.get("is_complete", False)
        wants_location_change = intent_result.get("wants_location_change", False)
        intent_type = intent_result.get("intent_type", "booking")
        reply = intent_result.get("reply", "...")
        language = intent_result.get("language", "english")
        new_state = intent_result.get("state", {})

        # --- Cancellation intent detected: branch to cancellation flow ---
        if intent_type == "cancellation" and is_valid:
            new_state["language"] = language
            new_state["phase"] = PHASE_CANCELLING
            self._save_state(session, new_state, db)
            return self._handle_cancellation_start(session, user, new_state, language, db, logger)

        # Carry forward location from session state
        if state.get("latitude"):
            new_state["latitude"] = state["latitude"]
            new_state["longitude"] = state["longitude"]
            if state.get("location_name"):
                new_state["location_name"] = state["location_name"]

        new_state["language"] = language

        # Handle location change request detected by Intent Agent
        if wants_location_change:
            new_state.pop("latitude", None)
            new_state.pop("longitude", None)
            new_state.pop("location_name", None)
            state.pop("providers", None)
            state.pop("shown_provider_ids", None)
            new_state["location_override"] = True
            new_state["phase"] = PHASE_GATHERING
            self._save_state(session, new_state, db)
            location_reply = self._requires_location_reply(language)
            self._save_message(session, "assistant", location_reply, db,
                               state=new_state, extra_data={"requires_location": True, "reason": "user_requested_change"})
            return self._build_response(location_reply, language, PHASE_GATHERING, session.id,
                                        new_state, logger, requires_location=True)

        self._save_message(session, "assistant", reply, db, state=new_state)

        if not is_valid or not is_complete:
            new_state["phase"] = PHASE_GATHERING
            self._save_state(session, new_state, db)
            return self._build_response(reply, language, PHASE_GATHERING, session.id, new_state, logger)

        # Intent complete — check if we have location
        has_location = bool(new_state.get("latitude") and new_state.get("longitude"))
        if not has_location and not new_state.get("location_override") and user and user.latitude and user.longitude:
            new_state["latitude"] = user.latitude
            new_state["longitude"] = user.longitude
            has_location = True

        if not has_location:
            # Need location from FE
            new_state["phase"] = PHASE_GATHERING
            self._save_state(session, new_state, db)
            location_reply = self._requires_location_reply(language)
            self._save_message(session, "assistant", location_reply, db,
                               state=new_state, extra_data={"requires_location": True})
            return self._build_response(location_reply, language, PHASE_GATHERING, session.id,
                                        new_state, logger, requires_location=True)

        # Have everything — discover providers
        new_state["phase"] = PHASE_SELECTING
        self._save_state(session, new_state, db)
        return self._discover_and_respond(session, user, new_state, language, db, logger)

    # --- Discover providers ---

    def _discover_and_respond(self, session, user, state, language, db, logger, exclude_ids=None):
        discovery_result = self.discovery_agent.process(state, user, db, logger, exclude_ids=exclude_ids)
        providers = discovery_result.get("recommended_providers", [])

        if not providers:
            reply = self._no_provider_reply(language, state.get("service_type"), state.get("booking_date"))
            self._save_message(session, "assistant", reply, db, state=state)
            state["phase"] = PHASE_SELECTING
            state["providers"] = []
            self._save_state(session, state, db)
            return self._build_response(reply, language, PHASE_SELECTING, session.id, state, logger)

        # Enrich each provider with a grounded "smart match" explanation (best-effort).
        try:
            smart_matches = self.smart_match_agent.process(providers, state, db, logger)
            for p in providers:
                p["smart_match"] = smart_matches.get(p["id"])
        except Exception as e:
            log.error(f"Smart match enrichment skipped: {str(e)[:100]}")

        reply = self._selection_reply(language, state.get("service_type"), len(providers), state.get("booking_date"), providers)
        self._save_message(session, "assistant", reply, db, state=state,
                           extra_data={"provider_count": len(providers)})

        state["phase"] = PHASE_SELECTING
        state["providers"] = providers
        self._save_state(session, state, db)

        return self._build_response(reply, language, PHASE_SELECTING, session.id, state, logger, providers=providers)

    # --- Phase: selecting_provider (FE sent selection) ---

    def _handle_provider_selected(self, session, user, state, provider_id, slot, date, db, logger):
        language = state.get("language", "english")

        provider = db.query(Provider).filter(Provider.id == provider_id).first()
        if not provider:
            reply = "Provider not found. Please select another."
            self._save_message(session, "assistant", reply, db, state=state,
                               extra_data={"error": "provider_not_found", "provider_id": provider_id})
            return self._build_response(reply, language, PHASE_SELECTING, session.id, state, logger,
                                        providers=state.get("providers"))

        try:
            slots_data = json.loads(provider.available_slots) if provider.available_slots else {}
        except (json.JSONDecodeError, TypeError):
            slots_data = {}
        if isinstance(slots_data, list):
            slots_data = {datetime.now().strftime("%Y-%m-%d"): slots_data}

        date_slots = slots_data.get(date, [])
        if slot not in date_slots:
            reply = self._slot_unavailable_reply(language, date_slots)
            self._save_message(session, "assistant", reply, db, state=state,
                               extra_data={"error": "slot_unavailable", "requested_slot": slot})
            return self._build_response(reply, language, PHASE_SELECTING, session.id, state, logger,
                                        providers=state.get("providers"))

        booking_summary = {
            "provider_id": provider.id,
            "provider_name": provider.name,
            "slot": slot,
            "date": date,
            "hourly_rate": provider.hourly_rate or 500,
            "location": provider.location,
            "rating": provider.rating,
            "available_slots": date_slots,
        }

        reply = self._confirmation_prompt_reply(language, booking_summary)
        self._save_message(session, "assistant", reply, db, state=state,
                           extra_data={"booking_summary": booking_summary})

        state["phase"] = PHASE_CONFIRMING
        state["booking_summary"] = booking_summary
        self._save_state(session, state, db)

        return self._build_response(reply, language, PHASE_CONFIRMING, session.id, state, logger,
                                    booking_summary=booking_summary)

    # --- Phase: selecting_provider (user typed message) ---

    def _handle_message_during_selection(self, session, user, state, message, db, logger):
        language = state.get("language", "english")
        service = state.get("service_type", "Unknown")

        # Use LLM to understand what the user wants
        system_instruction = f"""
You are analyzing a user's message during provider selection for Karigar AI.
The user was shown a list of {service} providers and is expected to select one from the UI.
Instead, they typed a message. Determine their intent.

Return ONLY a JSON object:
{{
  "action": "show_more" | "change_intent" | "change_date" | "other",
  "new_service": "Only if action is change_intent, the new service type, else null",
  "new_date": "Only if action is change_date, YYYY-MM-DD, else null",
  "reply": "A short reply in {language}"
}}

Rules:
- "show_more": user wants more/different providers for the SAME service (e.g., "show more", "doosra dikhao", "koi aur", "different area")
- "change_intent": user wants a COMPLETELY different service type (e.g., "mujhe plumber chahiye", "actually electrician")
- "change_date": user wants to change the booking date (e.g., "kal ke liye dikhao", "tomorrow")
- "other": anything else (greeting, question, etc.) — reply conversationally and guide them to select
- If replying in Roman Urdu, use ONLY Pakistani Urdu words. NEVER use Hindi words (swagat, dhanyavaad, sahayata, kripya). Use Pakistani equivalents (khush aamdeed, shukriya, madad, meharbani).
"""

        try:
            response_text = _call_llm(
                system_instruction=system_instruction,
                prompt=f"User's message: \"{message}\"",
                json_mode=True, temperature=0.1,
                agent="Selection Phase Analyzer", tracer=logger,
            )
            analysis = json.loads(response_text)
            logger.add_log("Selection Phase Analyzer", "Analyze", analysis)
        except Exception:
            analysis = {"action": "other", "reply": ""}

        action = analysis.get("action", "other")

        # --- SHOW MORE ---
        if action == "show_more":
            shown_ids = state.get("shown_provider_ids", [])
            current_providers = state.get("providers", [])
            shown_ids.extend([p["id"] for p in current_providers])
            state["shown_provider_ids"] = shown_ids

            return self._discover_and_respond(session, user, state, language, db, logger, exclude_ids=shown_ids)

        # --- CHANGE INTENT (user wants a different service mid-selection) ---
        elif action == "change_intent":
            new_service = analysis.get("new_service")
            if new_service:
                # Canonicalize against the known catalog (case-insensitive); else title-case.
                canon = next(
                    (s for s in SERVICE_CATALOG if s.lower() == new_service.strip().lower()),
                    new_service.strip().title(),
                )
                state["service_type"] = canon
                # Fresh search for the new service — drop the old list/selection.
                state.pop("providers", None)
                state.pop("shown_provider_ids", None)
                state.pop("booking_summary", None)
                state["phase"] = PHASE_SELECTING

                # We already know location + date, so go straight to discovery and
                # actually SHOW the new list (don't just promise it).
                if state.get("latitude") and state.get("longitude"):
                    self._save_state(session, state, db)
                    return self._discover_and_respond(session, user, state, language, db, logger)

                # No location yet — ask for it instead of promising a list we can't show.
                state["phase"] = PHASE_GATHERING
                self._save_state(session, state, db)
                location_reply = self._requires_location_reply(language)
                self._save_message(session, "assistant", location_reply, db, state=state,
                                   extra_data={"requires_location": True, "action": "change_intent"})
                return self._build_response(location_reply, language, PHASE_GATHERING, session.id,
                                            state, logger, requires_location=True)

            # Could not extract the new service — ask, but carry location forward.
            reply = analysis.get("reply") or "Theek hai, batayein aapko kya service chahiye?"
            new_state = {"language": language, "phase": PHASE_GATHERING}
            for k in ("latitude", "longitude", "location_name"):
                if state.get(k) is not None:
                    new_state[k] = state[k]
            self._save_message(session, "assistant", reply, db, state=new_state,
                               extra_data={"action": "change_intent"})
            self._save_state(session, new_state, db)
            return self._build_response(reply, language, PHASE_GATHERING, session.id, new_state, logger)

        # --- CHANGE DATE ---
        elif action == "change_date":
            new_date = analysis.get("new_date")
            if new_date:
                state["booking_date"] = new_date
                state.pop("providers", None)
                state.pop("shown_provider_ids", None)
                return self._discover_and_respond(session, user, state, language, db, logger)
            else:
                reply = analysis.get("reply") or "Kaunsi date chahiye? (e.g. kal, parso, ya koi specific date)"
                self._save_message(session, "assistant", reply, db, state=state,
                                   extra_data={"action": "change_date"})
                return self._build_response(reply, language, PHASE_SELECTING, session.id, state, logger)

        # --- OTHER (guide user) ---
        else:
            providers = state.get("providers", [])
            reply = analysis.get("reply") or self._selection_reply(language, service, len(providers), state.get("booking_date"), providers)
            self._save_message(session, "assistant", reply, db, state=state)
            return self._build_response(reply, language, PHASE_SELECTING, session.id, state, logger, providers=providers)

    # --- Re-show providers ---

    def _reshow_providers(self, session, state, language, db, logger):
        providers = state.get("providers", [])
        if providers:
            reply = self._selection_reply(language, state.get("service_type"), len(providers), state.get("booking_date"), providers)
            return self._build_response(reply, language, PHASE_SELECTING, session.id, state, logger, providers=providers)
        user = session.user
        return self._discover_and_respond(session, user, state, language, db, logger)

    # --- Phase: confirming_booking ---

    def _handle_confirming(self, session, user, state, message, db, logger):
        language = state.get("language", "english")
        booking_summary = state.get("booking_summary", {})
        available_slots = booking_summary.get("available_slots", [])

        if not message:
            reply = self._confirmation_prompt_reply(language, booking_summary)
            return self._build_response(reply, language, PHASE_CONFIRMING, session.id, state, logger,
                                        booking_summary=booking_summary)

        analysis = self.booking_agent.analyze_user_intent(message, booking_summary, available_slots, language, logger)
        action = analysis.get("action", "clarify")
        llm_reply = analysis.get("reply", "")

        # --- CONFIRM ---
        if action == "confirm":
            booking_result = self.booking_agent.create_booking(
                user_id=session.user_id,
                provider_id=booking_summary["provider_id"],
                slot=booking_summary["slot"],
                booking_date=booking_summary["date"],
                db=db, logger=logger
            )

            if booking_result["status"] != "confirmed":
                reply = booking_result["message"]
                self._save_message(session, "assistant", reply, db, state=state,
                                   extra_data={"action": "confirm", "status": "failed"})
                state["phase"] = PHASE_SELECTING
                state.pop("booking_summary", None)
                self._save_state(session, state, db)
                return self._build_response(reply, language, PHASE_SELECTING, session.id, state, logger,
                                            providers=state.get("providers"))

            reply = self._booking_confirmed_reply(language, booking_result)
            self._save_message(session, "assistant", reply, db, state=state,
                               extra_data={"action": "confirm", "booking_id": booking_result.get("booking_id")})

            # Trigger FCM push notification to user
            self._send_booking_notification(session.user_id, booking_result, db, logger)

            # Trigger Chat Summarizer in background
            threading.Thread(
                target=ChatSummarizerAgent().summarize,
                args=(session.id, booking_result["booking_id"])
            ).start()

            state["phase"] = PHASE_COMPLETED
            state.pop("booking_summary", None)
            state.pop("providers", None)
            self._save_state(session, state, db)
            session.status = "completed"
            db.commit()

            return self._build_response(reply, language, PHASE_COMPLETED, session.id, state, logger,
                                        booking_id=booking_result["booking_id"],
                                        notification={
                                            "title": "Booking Confirmed!",
                                            "body": f"{booking_result['provider_name']} will arrive on {booking_result['booking_date']} at {booking_result['slot']}.",
                                            "notification_type": "completed",
                                        })

        # --- CHANGE TIME ---
        elif action == "change_time":
            new_time = analysis.get("new_time")
            if new_time and new_time in available_slots:
                booking_summary["slot"] = new_time
                state["booking_summary"] = booking_summary
                self._save_state(session, state, db)
                reply = self._confirmation_prompt_reply(language, booking_summary)
                self._save_message(session, "assistant", reply, db, state=state,
                                   extra_data={"action": "change_time", "new_time": new_time})
                return self._build_response(reply, language, PHASE_CONFIRMING, session.id, state, logger,
                                            booking_summary=booking_summary)
            else:
                reply = llm_reply or self._slot_unavailable_reply(language, available_slots)
                self._save_message(session, "assistant", reply, db, state=state,
                                   extra_data={"action": "change_time", "error": "slot_unavailable"})
                return self._build_response(reply, language, PHASE_CONFIRMING, session.id, state, logger,
                                            booking_summary=booking_summary)

        # --- CHANGE PROVIDER ---
        elif action == "change_provider":
            # Track shown providers so we can exclude them
            shown_ids = state.get("shown_provider_ids", [])
            current_providers = state.get("providers", [])
            shown_ids.extend([p["id"] for p in current_providers if p["id"] not in shown_ids])
            state["shown_provider_ids"] = shown_ids
            state["phase"] = PHASE_SELECTING
            state.pop("booking_summary", None)
            self._save_state(session, state, db)

            # Re-discover with exclusions
            return self._discover_and_respond(session, user, state, language, db, logger, exclude_ids=shown_ids)

        # --- CHANGE INTENT ---
        elif action == "change_intent":
            reply = llm_reply or "Theek hai, batayein aapko kya service chahiye?"
            new_state = {"language": language, "phase": PHASE_GATHERING}
            self._save_message(session, "assistant", reply, db, state=new_state,
                               extra_data={"action": "change_intent"})
            self._save_state(session, new_state, db)
            return self._build_response(reply, language, PHASE_GATHERING, session.id, new_state, logger)

        # --- REJECT (decline this booking, go back to provider selection) ---
        elif action == "reject":
            state["phase"] = PHASE_SELECTING
            state.pop("booking_summary", None)
            self._save_state(session, state, db)

            providers = state.get("providers", [])
            if not providers:
                return self._discover_and_respond(session, user, state, language, db, logger)

            reply = self._selection_reply(language, state.get("service_type"),
                                          len(providers), state.get("booking_date"), providers)
            self._save_message(session, "assistant", reply, db, state=state,
                               extra_data={"action": "reject"})
            return self._build_response(reply, language, PHASE_SELECTING, session.id, state, logger,
                                        providers=providers)

        # --- CANCEL ---
        elif action == "cancel":
            reply = llm_reply or self._cancel_reply(language)
            self._save_message(session, "assistant", reply, db, state=state,
                               extra_data={"action": "cancel"})
            state["phase"] = PHASE_COMPLETED
            state.pop("booking_summary", None)
            state.pop("providers", None)
            self._save_state(session, state, db)
            session.status = "completed"
            db.commit()
            return self._build_response(reply, language, PHASE_COMPLETED, session.id, state, logger)

        # Fallback
        reply = llm_reply or self._confirmation_prompt_reply(language, booking_summary)
        self._save_message(session, "assistant", reply, db, state=state)
        return self._build_response(reply, language, PHASE_CONFIRMING, session.id, state, logger,
                                    booking_summary=booking_summary)

    # --- Phase: cancelling_booking ---

    def _handle_cancellation_start(self, session, user, state, language, db, logger):
        """Entry point: fetch user's bookings and show them."""
        user_id = session.user_id
        if not user_id:
            reply = self._cancel_no_bookings_reply(language)
            self._save_message(session, "assistant", reply, db, state=state)
            state["phase"] = PHASE_COMPLETED
            self._save_state(session, state, db)
            session.status = "completed"
            db.commit()
            return self._build_response(reply, language, PHASE_COMPLETED, session.id, state, logger)

        bookings = self.cancellation_agent.get_user_bookings(user_id, db, logger)

        if not bookings:
            reply = self._cancel_no_bookings_reply(language)
            self._save_message(session, "assistant", reply, db, state=state)
            state["phase"] = PHASE_COMPLETED
            self._save_state(session, state, db)
            session.status = "completed"
            db.commit()
            return self._build_response(reply, language, PHASE_COMPLETED, session.id, state, logger)

        if len(bookings) == 1:
            # Only one booking — go straight to confirmation
            b = bookings[0]
            state["cancel_booking_id"] = b["booking_id"]
            state["cancel_bookings"] = bookings
            state["cancel_phase"] = "confirm"
            self._save_state(session, state, db)
            reply = self._cancel_confirm_reply(language, b)
            self._save_message(session, "assistant", reply, db, state=state,
                               extra_data={"cancel_booking": b})
            return self._build_response(reply, language, PHASE_CANCELLING, session.id, state, logger,
                                        cancel_bookings=bookings)

        # Multiple bookings — show list and ask which one
        state["cancel_bookings"] = bookings
        state["cancel_phase"] = "identify"
        self._save_state(session, state, db)
        reply = self._cancel_list_reply(language, bookings)
        self._save_message(session, "assistant", reply, db, state=state,
                           extra_data={"cancel_bookings": bookings})
        return self._build_response(reply, language, PHASE_CANCELLING, session.id, state, logger,
                                    cancel_bookings=bookings)

    def _handle_cancel_booking_selected(self, session, user, state, booking_id, db, logger):
        """Handle FE tap: user selected a booking card to cancel (skips LLM selection)."""
        language = state.get("language", "english")
        bookings = state.get("cancel_bookings", [])
        matched = next((b for b in bookings if b["booking_id"] == booking_id), None)

        if not matched:
            # booking_id not in the list — could be stale; re-fetch
            bookings = self.cancellation_agent.get_user_bookings(session.user_id, db, logger)
            matched = next((b for b in bookings if b["booking_id"] == booking_id), None)

        if not matched:
            reply = self._cancel_clarify_reply(language)
            self._save_message(session, "assistant", reply, db, state=state)
            return self._build_response(reply, language, PHASE_CANCELLING, session.id, state, logger,
                                        cancel_bookings=bookings or None)

        state["cancel_booking_id"] = booking_id
        state["cancel_phase"] = "confirm"
        self._save_state(session, state, db)
        reply = self._cancel_confirm_reply(language, matched)
        self._save_message(session, "assistant", reply, db, state=state,
                           extra_data={"cancel_booking": matched})
        return self._build_response(reply, language, PHASE_CANCELLING, session.id, state, logger)

    def _handle_cancellation_message(self, session, user, state, message, db, logger):
        """Handle user text messages during cancellation flow."""
        language = state.get("language", "english")
        cancel_phase = state.get("cancel_phase", "identify")

        if not message:
            bookings = state.get("cancel_bookings", [])
            if bookings:
                reply = self._cancel_list_reply(language, bookings)
            else:
                reply = self._cancel_no_bookings_reply(language)
            return self._build_response(reply, language, PHASE_CANCELLING, session.id, state, logger,
                                        cancel_bookings=bookings or None)

        # Note: user message already saved by _route(), no need to save again

        # --- Sub-phase: identify which booking ---
        if cancel_phase == "identify":
            bookings = state.get("cancel_bookings", [])
            analysis = self.cancellation_agent.analyze_selection(message, bookings, language, logger)
            selected_id = analysis.get("selected_booking_id")

            if selected_id:
                # Verify the booking_id is in the user's list
                matched = next((b for b in bookings if b["booking_id"] == selected_id), None)
                if matched:
                    state["cancel_booking_id"] = selected_id
                    state["cancel_phase"] = "confirm"
                    self._save_state(session, state, db)
                    reply = self._cancel_confirm_reply(language, matched)
                    self._save_message(session, "assistant", reply, db, state=state)
                    return self._build_response(reply, language, PHASE_CANCELLING, session.id, state, logger)

            # Could not identify — ask again
            reply = analysis.get("reply", self._cancel_clarify_reply(language))
            self._save_message(session, "assistant", reply, db, state=state)
            return self._build_response(reply, language, PHASE_CANCELLING, session.id, state, logger)

        # --- Sub-phase: confirm cancellation ---
        elif cancel_phase == "confirm":
            analysis = self.cancellation_agent.analyze_confirmation(message, language, logger)
            action = analysis.get("action", "no")

            if action == "yes":
                booking_id = state.get("cancel_booking_id")
                result = self.cancellation_agent.cancel_booking(booking_id, session.user_id, db, logger)

                if result["status"] == "cancelled":
                    reply = self._cancel_success_reply(language, result)
                else:
                    reply = result["message"]

                self._save_message(session, "assistant", reply, db, state=state,
                                   extra_data={"action": "cancel_confirmed", "cancel_result": result})
                state["phase"] = PHASE_COMPLETED
                state.pop("cancel_booking_id", None)
                state.pop("cancel_bookings", None)
                state.pop("cancel_phase", None)
                self._save_state(session, state, db)
                session.status = "completed"
                db.commit()

                notif = None
                if result["status"] == "cancelled":
                    notif = {
                        "title": "Booking Cancelled",
                        "body": f"Your booking with {result['provider_name']} on {result['date']} at {result['slot']} has been cancelled.",
                        "notification_type": "canceled",
                    }
                return self._build_response(reply, language, PHASE_COMPLETED, session.id, state, logger,
                                            notification=notif)

            else:
                # User declined cancellation
                reply = analysis.get("reply") or self._cancel_declined_reply(language)
                self._save_message(session, "assistant", reply, db, state=state,
                                   extra_data={"action": "cancel_declined"})
                state["phase"] = PHASE_COMPLETED
                state.pop("cancel_booking_id", None)
                state.pop("cancel_bookings", None)
                state.pop("cancel_phase", None)
                self._save_state(session, state, db)
                session.status = "completed"
                db.commit()
                return self._build_response(reply, language, PHASE_COMPLETED, session.id, state, logger)

    # --- Cancellation reply templates ---

    def _cancel_no_bookings_reply(self, lang):
        if lang == "roman_urdu":
            return "Aapki koi active booking nahi hai jo cancel ki ja sake."
        elif lang == "urdu":
            return "آپ کی کوئی ایکٹو بکنگ نہیں ہے جو کینسل کی جا سکے۔"
        return "You don't have any active bookings to cancel."

    def _cancel_list_reply(self, lang, bookings):
        count = len(bookings)
        if lang == "roman_urdu":
            return f"Aapki {count} upcoming bookings hain.\n\n👇 Jo booking cancel karni hai usse select karein."
        elif lang == "urdu":
            return f"آپ کی {count} آنے والی بکنگز ہیں۔\n\n👇 جو بکنگ کینسل کرنی ہے اسے منتخب کریں۔"
        return f"You have {count} upcoming bookings.\n\n👇 Select the booking you'd like to cancel."

    def _cancel_confirm_reply(self, lang, booking):
        name = booking["provider_name"]
        date = booking["date"]
        slot = booking["slot"]
        service = booking["service_type"]
        if lang == "roman_urdu":
            return f"Kya aap waaqi {name} ki {service} booking ({date}, {slot}) cancel karna chahte hain?"
        elif lang == "urdu":
            return f"کیا آپ واقعی {name} کی {service} بکنگ ({date}، {slot}) کینسل کرنا چاہتے ہیں؟"
        return f"Are you sure you want to cancel your {service} booking with {name} on {date} at {slot}?"

    def _cancel_success_reply(self, lang, result):
        name = result["provider_name"]
        date = result["date"]
        slot = result["slot"]
        bid = result["booking_id"]
        if lang == "roman_urdu":
            return f"Booking #{bid} ({name}, {date} {slot}) cancel ho gayi hai. Agar dobara zaroorat ho toh hum yahan hain. Thank You!"
        elif lang == "urdu":
            return f"بکنگ #{bid} ({name}، {date} {slot}) کینسل ہو گئی ہے۔ اگر دوبارہ ضرورت ہو تو ہم یہاں ہیں!"
        return f"Booking #{bid} ({name}, {date} {slot}) has been cancelled. We're here if you need us again. Thank You!"

    def _cancel_declined_reply(self, lang):
        if lang == "roman_urdu":
            return "Theek hai, booking cancel nahi ki. Aapki booking safe hai!"
        elif lang == "urdu":
            return "ٹھیک ہے، بکنگ کینسل نہیں کی۔ آپ کی بکنگ محفوظ ہے!"
        return "Alright, booking not cancelled. Your booking is safe!"

    def _cancel_clarify_reply(self, lang):
        if lang == "roman_urdu":
            return "Samajh nahi aayi. Kya aap booking ka number bata sakte hain?"
        elif lang == "urdu":
            return "سمجھ نہیں آئی۔ کیا آپ بکنگ کا نمبر بتا سکتے ہیں؟"
        return "I didn't catch that. Could you tell me the booking number?"

    # --- Phase: completed (user sends another message -> new session) ---

    def _handle_completed_restart(self, session, user, state, message, user_id, db, logger):
        new_session = ChatSession(user_id=user_id, status="active")
        db.add(new_session)
        db.commit()
        db.refresh(new_session)

        new_state = {"phase": PHASE_GATHERING, "language": state.get("language", "english")}

        if message:
            self._save_message(new_session, "user", message, db, state=new_state)
        self._save_state(new_session, new_state, db)
        return self._handle_gathering(new_session, user, new_state, db, logger)

    # --- Direct booking shortcut (keeps /book endpoint working) ---

    def process_booking(self, user_id: int, provider_id: int, slot: str, booking_date: str,
                        db: Session, language: str = "english"):
        logger = AgentExecutionLog()
        booking_result = self.booking_agent.create_booking(user_id, provider_id, slot, booking_date, db, logger)

        if booking_result["status"] != "confirmed":
            return {
                "reply": booking_result["message"], "status": "failed",
                "remaining_slots": booking_result.get("remaining_slots"),
                "debug_logs": logger.logs
            }

        reply = self._booking_confirmed_reply(language, booking_result)

        # Trigger FCM notification
        self._send_booking_notification(user_id, booking_result, db, logger)

        return {
            "reply": reply, "status": "confirmed",
            "booking_id": booking_result["booking_id"],
            "provider_name": booking_result["provider_name"],
            "booking_date": booking_result["booking_date"],
            "slot": booking_result["slot"],
            "debug_logs": logger.logs
        }

    # --- FCM Notification ---

    def _send_booking_notification(self, user_id, booking_result, db, logger):
        """Send FCM push notification to user on booking confirmation."""
        try:
            from bookings_notifications import trigger_push_notification

            user = db.query(User).filter(User.id == user_id).first()
            if not user or not user.device_token:
                logger.add_log("FCM", "Skip", f"No device token for user {user_id}")
                return

            title = "Booking Confirmed!"
            body = (f"{booking_result['provider_name']} will arrive on "
                    f"{booking_result['booking_date']} at {booking_result['slot']}.")

            push_result = trigger_push_notification(
                device_token=user.device_token,
                title=title,
                message=body,
                data={
                    "booking_id": str(booking_result["booking_id"]),
                    "type": "booking_confirmation",
                }
            )

            # Also save notification to DB
            notification = Notification(
                title=title,
                message=body,
                type="booking_confirmation",
                is_read=False,
                created_at=datetime.now().isoformat(),
                user_id=user_id,
                booking_id=booking_result["booking_id"],
            )
            db.add(notification)
            db.commit()

            logger.add_log("FCM", "Push Sent", {
                "status": push_result.status,
                "service": push_result.service,
            })
        except Exception as e:
            log.error(f"FCM notification failed: {str(e)[:100]}")
            logger.add_log("FCM", "Error", str(e)[:100])

    # ============================================================
    # Reply templates
    # ============================================================

    def _no_provider_reply(self, lang, service_type, booking_date=None):
        d = f" on {booking_date}" if booking_date else ""
        if lang == "roman_urdu":
            du = f" {booking_date} ko" if booking_date else ""
            return f"Maaf kijiye, is waqt koi {service_type}{du} available nahi hai. Koi aur din ya service try karein."
        elif lang == "urdu":
            du = f" {booking_date} کو" if booking_date else ""
            return f"معذرت، اس وقت کوئی {service_type}{du} دستیاب نہیں۔ کوئی اور دن یا سروس آزمائیں۔"
        return f"Sorry, no {service_type} is available{d}. Try another date or service."

    def _selection_reply(self, lang, service_type, count, booking_date=None, providers=None):
        providers = providers or []
        d = f" for {booking_date}" if booking_date else ""

        # Build provider list with prices
        provider_lines = ""
        for i, p in enumerate(providers, 1):
            rate = p.get("hourly_rate", 500)
            rating = p.get("rating", 0)
            loc = p.get("location", "")
            name = p.get("name", "")
            dist = p.get("distance_km")
            dist_str = f" • 📍 {dist} km" if dist else ""
            provider_lines += f"\n{i}. 👤 {name} ({loc}){dist_str}\n   💰 Rs. {rate}/hr | ⭐ {rating}/5"

        if lang == "roman_urdu":
            du = f" {booking_date} ke liye" if booking_date else ""
            header = f"✨ Yeh rahay aap ke nazdeek {count} behtareen {service_type}s{du}:\n"
            footer = "\n\n👇 Baraye meharbani apna provider aur time slot select karein."
        elif lang == "urdu":
            du = f" {booking_date} کے لیے" if booking_date else ""
            header = f"✨ یہ رہے آپ کے قریب {count} بہترین {service_type}{du}:\n"
            footer = "\n\n👇 براہ کرم اپنا پرووائیڈر اور ٹائم سلاٹ منتخب کریں۔"
        else:
            header = f"✨ Here are {count} top-rated {service_type}(s) near you{d}:\n"
            footer = "\n\n👇 Please select your preferred provider and time slot."

        return header + provider_lines + footer

    def _confirmation_prompt_reply(self, lang, summary):
        name = summary["provider_name"]
        loc = summary["location"]
        slot = summary["slot"]
        date = summary["date"]
        rate = summary["hourly_rate"]
        rating = summary["rating"]

        if lang == "roman_urdu":
            return (f"📝 Booking ki Tafseelat:\n"
                    f"👤 {name} ({loc})\n"
                    f"📅 Date: {date}\n"
                    f"⏰ Time: {slot}\n"
                    f"💰 Charges: Rs. {rate}/hour\n"
                    f"⭐ Rating: {rating}/5\n\n"
                    f"✅ Kya confirm karein? Agar time change karna hai toh bata dein.")
        elif lang == "urdu":
            return (f"📝 بکنگ کی تفصیلات:\n"
                    f"👤 {name} ({loc})\n"
                    f"📅 تاریخ: {date}\n"
                    f"⏰ وقت: {slot}\n"
                    f"💰 چارجز: Rs. {rate}/گھنٹہ\n"
                    f"⭐ ریٹنگ: {rating}/5\n\n"
                    f"✅ کیا کنفرم کریں؟ اگر وقت تبدیل کرنا ہو تو بتائیں۔")
        return (f"📝 Booking details:\n"
                f"👤 {name} ({loc})\n"
                f"📅 Date: {date}\n"
                f"⏰ Time: {slot}\n"
                f"💰 Charges: Rs. {rate}/hour\n"
                f"⭐ Rating: {rating}/5\n\n"
                f"✅ Confirm? You can also change the time if needed.")

    def _booking_confirmed_reply(self, lang, result):
        name = result["provider_name"]
        loc = result["provider_location"]
        slot = result["slot"]
        date = result["booking_date"]
        rate = result.get("hourly_rate", 500)
        rating = result["rating"]
        bid = result.get("booking_id", "")

        if lang == "roman_urdu":
            return (f"🎉 Booking confirmed!\n\n"
                    f"🔖 Booking #{bid}\n"
                    f"👤 Provider: {name}\n"
                    f"📍 Location: {loc}\n"
                    f"📅 Date: {date}\n"
                    f"⏰ Time: {slot}\n"
                    f"💰 Charges: Rs. {rate}/hour\n"
                    f"⭐ Rating: {rating}/5\n\n"
                    f"🙏 Shukriya! Aapko notification mil jayega.")
        elif lang == "urdu":
            return (f"🎉 بکنگ کنفرم!\n\n"
                    f"🔖 بکنگ #{bid}\n"
                    f"👤 پرووائیڈر: {name}\n"
                    f"📍 مقام: {loc}\n"
                    f"📅 تاریخ: {date}\n"
                    f"⏰ وقت: {slot}\n"
                    f"💰 چارجز: Rs. {rate}/گھنٹہ\n"
                    f"⭐ ریٹنگ: {rating}/5\n\n"
                    f"🙏 شکریہ! آپ کو نوٹیفکیشن مل جائے گا۔")
        return (f"🎉 Booking confirmed!\n\n"
                f"🔖 Booking #{bid}\n"
                f"👤 Provider: {name}\n"
                f"📍 Location: {loc}\n"
                f"📅 Date: {date}\n"
                f"⏰ Time: {slot}\n"
                f"💰 Charges: Rs. {rate}/hour\n"
                f"⭐ Rating: {rating}/5\n\n"
                f"🙏 Thank you! You'll receive a notification shortly.")

    def _slot_unavailable_reply(self, lang, available_slots):
        s = ", ".join(available_slots) if available_slots else "none"
        if lang == "roman_urdu":
            return f"Yeh time available nahi hai. Available slots: {s}. Kaunsa select karein?"
        elif lang == "urdu":
            return f"یہ وقت دستیاب نہیں۔ دستیاب سلاٹس: {s}۔ کونسا منتخب کریں؟"
        return f"That time isn't available. Available slots: {s}. Which one would you like?"

    def _change_provider_reply(self, lang):
        if lang == "roman_urdu":
            return "Theek hai, doosra provider select karein:"
        elif lang == "urdu":
            return "ٹھیک ہے، دوسرا پرووائیڈر منتخب کریں:"
        return "Sure, select a different provider:"

    def _detect_location_change_intent(self, message: str) -> bool:
        """Use LLM to detect if user wants to change their location."""
        try:
            result = _call_llm(
                system_instruction=(
                    "You are a classifier. Determine if the user's message is asking to change, update, or switch "
                    "their location or address. The message may be in English, Roman Urdu, or Urdu. "
                    "Reply with ONLY 'yes' or 'no'."
                ),
                prompt=f"User message: {message}",
                json_mode=False,
                temperature=0.0,
                agent="Location Change Detector",
            )
            return result.strip().lower().startswith("yes")
        except Exception:
            return False

    def _requires_location_reply(self, lang):
        if lang == "roman_urdu":
            return "Aapki location chahiye taake nazdeeki provider dhundh sakein. Map se apni location select karein."
        elif lang == "urdu":
            return "آپ کی لوکیشن چاہیے تاکہ قریبی پرووائیڈر تلاش کر سکیں۔ نقشے سے اپنی لوکیشن منتخب کریں۔"
        return "We need your location to find nearby providers. Please select your location on the map."

    def _cancel_reply(self, lang):
        if lang == "roman_urdu":
            return "Theek hai, booking cancel kar di. Agar baad mein zaroorat ho toh hum yahan hain!"
        elif lang == "urdu":
            return "ٹھیک ہے، بکنگ منسوخ کر دی۔ اگر بعد میں ضرورت ہو تو ہم یہاں ہیں!"
        return "Alright, booking cancelled. We're here whenever you need us!"
