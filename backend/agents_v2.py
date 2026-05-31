import json
import math
import os
import logging
import threading
from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session
from models import Provider, Booking, User, ChatSession, ChatMessage, Notification
from database import SessionLocal
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger("agents_v2")

# ============================================================
# LLM Provider Abstraction (Gemini primary, Groq fallback)
# ============================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

gemini_client = None
groq_client = None

if GEMINI_API_KEY:
    # pyrefly: ignore [missing-import]
    from google import genai
    from google.genai import types
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)

if GROQ_API_KEY:
    from groq import Groq
    groq_client = Groq(api_key=GROQ_API_KEY)

GEMINI_MODEL = "gemini-2.5-flash"
GROQ_MODEL = "llama-3.3-70b-versatile"


def _call_llm(system_instruction: str, prompt: str, json_mode: bool = True, max_tokens: int = 1024, temperature: float = 0.2) -> str:
    """Call LLM with automatic fallback: Groq (primary) -> Gemini (fallback)."""

    # --- Try Groq first (faster, higher free quota) ---
    if groq_client:
        try:
            messages = [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt},
            ]
            kwargs = {
                "model": GROQ_MODEL,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            response = groq_client.chat.completions.create(**kwargs)
            log.info(f"LLM: Groq ({GROQ_MODEL}) succeeded")
            return response.choices[0].message.content
        except Exception as e:
            error_msg = str(e)
            log.warning(f"LLM: Groq failed ({error_msg[:80]}), falling back to Gemini...")

    # --- Fallback to Gemini ---
    if gemini_client:
        try:
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=temperature,
                max_output_tokens=max_tokens,
            )
            if json_mode:
                config.response_mime_type = "application/json"

            response = gemini_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=config,
            )
            log.info(f"LLM: Gemini ({GEMINI_MODEL}) succeeded")
            return response.text
        except Exception as e:
            error_msg = str(e)
            log.error(f"LLM: Gemini also failed ({error_msg[:80]})")


    raise Exception("No LLM provider available. Set GEMINI_API_KEY or GROQ_API_KEY in .env.")


# ============================================================
# Constants
# ============================================================

MAX_RECENT_MESSAGES = 6

# Phases
PHASE_GATHERING = "gathering_intent"
PHASE_SELECTING = "selecting_provider"
PHASE_CONFIRMING = "confirming_booking"
PHASE_CANCELLING = "cancelling_booking"
PHASE_COMPLETED = "completed"

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return round(R * c, 2)


class AgentExecutionLog:
    def __init__(self):
        self.logs = []

    def add_log(self, agent_name, action, result):
        self.logs.append({
            "agent": agent_name,
            "action": action,
            "result": result,
            "timestamp": datetime.now().isoformat()
        })


# ============================================================
# Rolling Window
# ============================================================

def _summarize_messages(messages: list) -> str:
    if not messages:
        return ""
    transcript = ""
    for msg in messages:
        role = "User" if msg["role"] == "user" else "Assistant"
        transcript += f"{role}: {msg['content']}\n"
    try:
        result = _call_llm(
            system_instruction="You are a concise summarizer. Summarize conversations preserving key details.",
            prompt=f"Summarize this conversation in 2-3 sentences, preserving key details (service needed, location, language preference, any decisions made):\n\n{transcript}",
            json_mode=False,
            max_tokens=200,
            temperature=0.1,
        )
        return result.strip()
    except Exception:
        for msg in reversed(messages):
            if msg["role"] == "user":
                return f"Earlier: user asked about {msg['content'][:100]}"
        return ""


def _build_windowed_context(all_messages: list, context_summary: str = None):
    if len(all_messages) <= MAX_RECENT_MESSAGES:
        return all_messages, context_summary, False

    old_messages = all_messages[:-MAX_RECENT_MESSAGES]
    recent_messages = all_messages[-MAX_RECENT_MESSAGES:]

    needs_summary_update = context_summary is None
    if needs_summary_update:
        context_summary = _summarize_messages(old_messages)

    return recent_messages, context_summary, needs_summary_update


# ============================================================
# Agent 1: Intent Validation
# ============================================================

class IntentValidationAgent:
    """Extracts service_type and booking timing. Location is handled via GPS from FE."""

    def __init__(self):
        self.name = "Intent & Validation Agent"

    def process(self, messages: list, user: User, cached_state: dict, context_summary: str, logger: AgentExecutionLog):
        today_str = datetime.now().strftime("%Y-%m-%d")

        prev_language = cached_state.get("language")
        language_lock = ""
        if prev_language and prev_language != "unknown":
            language_lock = f"\n(Context only: the user's previous message was in '{prev_language}'. Use this ONLY to break a tie when the CURRENT message is too short to tell — e.g. just 'ok', 'haan', or a number. Otherwise ignore it and go by the current message.)"

        state_context = ""
        if cached_state.get("service_type") and cached_state["service_type"] != "Unknown":
            state_context += f"\nAlready extracted service_type: {cached_state['service_type']}. Do NOT re-ask unless user wants to change it."
        if cached_state.get("booking_type"):
            state_context += f"\nAlready extracted booking_type: {cached_state['booking_type']}."
        if cached_state.get("booking_date"):
            state_context += f"\nAlready extracted booking_date: {cached_state['booking_date']}."

        system_instruction = f"""
You are a friendly, warm, and empathetic customer service AI for Karigar AI (home service platform). You speak Urdu, Roman Urdu, and English naturally — like a helpful Pakistani neighbor.

Today's date is: {today_str}

PERSONALITY:
- Be warm and human. Greet users back if they greet you.
- Show empathy for their problem
- Confirm what you understood before proceeding
- Keep replies short but caring — 1-2 sentences max.
{language_lock}

LANGUAGE MIRRORING (most important rule):
- Read the user's LATEST message and reply in the EXACT same language and script as that message:
  - User writes in English (e.g. "I want a plumber", "I want it for today", "Hello") → reply in English.
  - User writes in Roman Urdu (e.g. "plumber chahiye", "AC kaam nahi kar raha") → reply in Roman Urdu.
  - User writes in Urdu script → reply in Urdu script.
- The user may switch languages at any point. Judge EACH message on its own. Do NOT keep replying in an earlier language just because the conversation started that way.
- Greet in the same language the user greeted you in: "Hello"/"Hi" → English greeting; "Assalam o Alaikum"/"salam" → Roman Urdu greeting.

LANGUAGE PURITY (only when replying in Roman Urdu):
- Use natural Pakistani Urdu vocabulary. Avoid Hindi-specific words like "swagat", "dhanyavaad", "sahayata", "kripya", "padhariye".
- Sound like a real friendly Pakistani — casual, warm, conversational. NOT robotic or overly formal.
- Good Roman Urdu greeting: "Assalam o Alaikum! Karigar AI mein khush aamdeed. Aaj main aapki kya madad kar sakta hoon?"
- Good English greeting: "Hello! Welcome to Karigar AI. How can I help you today?"

CONVERSATION FLOW:
- On the FIRST message: Greet warmly, introduce Karigar AI briefly, and ask how you can help. Set is_complete: false.
- Once service_type is confirmed: Ask about timing — "Aaj ke liye chahiye ya kisi aur din ke liye?"
- If user says "today"/"aaj"/"abhi"/"urgent" → set booking_type: "urgent", booking_date: "{today_str}"
- If user says a future date or "kal"/"parso"/"next week" → set booking_type: "scheduled", booking_date: the actual date in YYYY-MM-DD format. "kal" = tomorrow ({(datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")}), "parso" = day after tomorrow ({(datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")}).
- is_complete: true ONLY when service_type AND booking_date are both known (not 'Unknown'/null) AND user has confirmed.
- Do NOT ask for location — location is handled separately via GPS/map.
{state_context}

CRITICAL RULES:
1. LANGUAGE: Mirror the language/script of the user's LATEST message exactly (see LANGUAGE MIRRORING above). Never default to Roman Urdu when the user actually wrote in English.
2. VALIDATION: If the user's message is NOT related to booking a home service AND NOT about cancelling/checking a booking, set "is_valid": false and politely redirect.
3. IDENTITY: If the user asks who you are or what Karigar AI is (e.g., 'who is Karigar Ai', 'what is you', 'what are you'), briefly explain that Karigar AI is a home service platform, mention a few services we provide (like AC Repair, Plumbing, Electricians, etc.), and politely ask how you can help them today.
4. SERVICE EXTRACTION: Extract the service type. It MUST map to one of: "AC Technician", "Plumber", "Electrician", "Beautician", "Painter", "Carpenter", "Appliance Repair", "Pest Control", "Home Cleaning", "Locksmith". Infer from context.
5. TIMING: After service is confirmed, ask about timing.
6. Do NOT ask for location or address. It will be provided via map.
7. CANCELLATION/STATUS: If the user wants to cancel a booking or check booking status (e.g., "booking cancel karo", "meri booking cancel karni hai", "cancel my booking", "booking ka status", "meri bookings dikhao"), set "intent_type": "cancellation". Do NOT try to extract service_type for cancellation requests.

LOCATION CHANGE:
- If the user asks to change, update, or switch their location/address (e.g. "location change karni hai", "jagah badlo", "different location"), set "wants_location_change": true.
- Otherwise set "wants_location_change": false.

You MUST return ONLY a valid JSON object:
{{
  "reply": "Your conversational response in the user's language.",
  "language": "english" | "roman_urdu" | "urdu",
  "intent_type": "booking" | "cancellation",
  "is_valid": true/false,
  "rejection_reason": "Only if is_valid is false.",
  "wants_location_change": true/false,
  "state": {{
    "service_type": "Extracted service or 'Unknown'",
    "booking_type": "urgent" | "scheduled" | null,
    "booking_date": "YYYY-MM-DD or null"
  }},
  "is_complete": false
}}

Set "intent_type" to "cancellation" if the user wants to cancel or check a booking. Otherwise "booking".
Set "is_complete": true ONLY when intent_type is "booking" AND service_type AND booking_date are BOTH known AND user has confirmed.
"""

        chat_transcript = ""
        if context_summary:
            chat_transcript += f"[Summary of earlier conversation: {context_summary}]\n\n"
        for msg in messages:
            role = "User" if msg["role"] == "user" else "Assistant"
            chat_transcript += f"{role}: {msg['content']}\n"

        prompt = f"Chat History:\n{chat_transcript}\n\nAnalyze and respond."

        try:
            response_text = _call_llm(
                system_instruction=system_instruction,
                prompt=prompt,
                json_mode=True,
                temperature=0.2,
            )
        except Exception as e:
            log.error(f"All LLM providers failed: {str(e)[:100]}")
            return {
                "reply": "Something went wrong on our end (free API Quota got exhausted). Please try again.",
                "language": cached_state.get("language", "english"),
                "is_valid": True, "rejection_reason": None,
                "state": cached_state or {"service_type": "Unknown", "booking_type": None, "booking_date": None},
                "is_complete": False, "_error": "llm_error"
            }

        try:
            result = json.loads(response_text)
        except json.JSONDecodeError:
            result = {
                "reply": "I'm having trouble understanding. Could you repeat that?",
                "language": cached_state.get("language", "english"),
                "is_valid": True, "rejection_reason": None,
                "state": cached_state or {"service_type": "Unknown", "booking_type": None, "booking_date": None},
                "is_complete": False
            }

        # Merge: keep previously extracted values
        new_state = result.get("state", {})
        if cached_state:
            for key in ["service_type", "booking_type", "booking_date"]:
                new_val = new_state.get(key)
                old_val = cached_state.get(key)
                if (not new_val or new_val == "Unknown" or new_val is None) and old_val and old_val != "Unknown":
                    new_state[key] = old_val
            # Language: trust the model's per-message detection. Only fall back to
            # the previous language when the model returned nothing usable.
            if not result.get("language") or result.get("language") == "unknown":
                result["language"] = cached_state.get("language") or "english"

        result["state"] = new_state
        logger.add_log(self.name, "Intent Extraction & Validation", result)
        return result


# ============================================================
# Agent 2: Provider Discovery
# ============================================================

class ProviderDiscoveryAgent:
    """Finds nearest active providers with available slots for the requested date."""

    def __init__(self):
        self.name = "Provider Discovery Agent"

    def process(self, intent_data: dict, user: User, db: Session, logger: AgentExecutionLog, exclude_ids: list = None):
        service = intent_data.get("service_type")
        booking_date = intent_data.get("booking_date")
        exclude_ids = exclude_ids or []

        # Get user coordinates from state (passed via chat API) or user profile
        user_lat = intent_data.get("latitude")
        user_lon = intent_data.get("longitude")
        if not user_lat or not user_lon:
            if user and user.latitude and user.longitude:
                user_lat, user_lon = user.latitude, user.longitude

        query = db.query(Provider).filter(
            Provider.service_type.ilike(f"%{service}%"),
        )
        if exclude_ids:
            query = query.filter(~Provider.id.in_(exclude_ids))

        providers = query.all()

        logger.add_log(self.name, "DB Query", f"Found {len(providers)} providers for '{service}' (excluded {len(exclude_ids)}).")

        if not providers:
            return {"recommended_providers": [], "message": "No available providers found."}

        provider_list = []
        for p in providers:
            try:
                slots_data = json.loads(p.available_slots) if p.available_slots else {}
            except (json.JSONDecodeError, TypeError):
                slots_data = {}

            if isinstance(slots_data, list):
                today_str = datetime.now().strftime("%Y-%m-%d")
                slots_data = {today_str: slots_data} if slots_data else {}

            if not slots_data:
                continue

            if booking_date:
                date_slots = slots_data.get(booking_date, [])
                if not date_slots:
                    continue
            else:
                date_slots = slots_data

            distance_km = None
            if user_lat and user_lon and p.latitude and p.longitude:
                distance_km = haversine(user_lat, user_lon, p.latitude, p.longitude)

            provider_entry = {
                "id": p.id,
                "name": p.name,
                "location": p.location,
                "rating": p.rating,
                "hourly_rate": p.hourly_rate or 500,
                "distance_km": distance_km,
            }

            if booking_date:
                provider_entry["available_slots"] = date_slots
                provider_entry["booking_date"] = booking_date
            else:
                provider_entry["available_slots_by_date"] = slots_data

            provider_list.append(provider_entry)

        if provider_list and provider_list[0]["distance_km"] is not None:
            max_distance = max(p["distance_km"] for p in provider_list) or 1
            provider_list.sort(
                key=lambda p: -(p["rating"] / 5.0 * 0.4 + (1 - p["distance_km"] / max_distance) * 0.6)
            )
        else:
            provider_list.sort(key=lambda p: -p["rating"])

        top_providers = provider_list[:3]

        logger.add_log(self.name, "Provider Ranking", {
            "total_found": len(provider_list),
            "top_3": [p["name"] for p in top_providers]
        })

        return {"recommended_providers": top_providers, "message": None}


# ============================================================
# Agent 2b: Smart Match (Provider Discovery sub-agent)
# ============================================================

class SmartMatchAgent:
    """Grounded-reasoning sub-agent for Provider Discovery.

    Given the shortlisted providers + the user's request, it explains WHY each
    provider fits — reasoning over a fact sheet built ONLY from existing
    provider/booking data (distance, rate, rating, open slots, completed jobs).
    The LLM may decide which factors matter and how to phrase them, but it can
    only cite facts present in the sheet (no fabricated certifications/counts).

    Output is keyed by provider_id so the orchestrator can attach each result
    to the matching provider entry without changing the response structure.
    """

    VALID_FACTORS = {"proximity", "price", "rating", "availability", "experience", "speed"}

    def __init__(self):
        self.name = "Smart Match Agent"

    def _booking_counts(self, provider_ids: list, db: Session) -> dict:
        if not provider_ids:
            return {}
        try:
            rows = (
                db.query(Booking.provider_id, func.count(Booking.id))
                .filter(Booking.provider_id.in_(provider_ids))
                .group_by(Booking.provider_id)
                .all()
            )
            return {pid: cnt for pid, cnt in rows}
        except Exception:
            return {}

    def _build_fact_sheet(self, providers: list, db: Session):
        ids = [p["id"] for p in providers]
        counts = self._booking_counts(ids, db)

        sheet = []
        for p in providers:
            slots = p.get("available_slots")
            slot_count = len(slots) if isinstance(slots, list) else None
            sheet.append({
                "provider_id": p["id"],
                "name": p.get("name"),
                "location": p.get("location"),
                "distance_km": p.get("distance_km"),
                "hourly_rate": p.get("hourly_rate"),
                "rating": p.get("rating"),
                "open_slots_on_date": slot_count,
                "completed_bookings": counts.get(p["id"], 0),
            })

        def _winner(key, lowest_wins):
            vals = [(s["provider_id"], s[key]) for s in sheet if s.get(key) is not None]
            if not vals:
                return None
            return (min if lowest_wins else max)(vals, key=lambda x: x[1])[0]

        flags = {
            "closest_provider_id": _winner("distance_km", lowest_wins=True),
            "cheapest_provider_id": _winner("hourly_rate", lowest_wins=True),
            "highest_rated_provider_id": _winner("rating", lowest_wins=False),
            "most_experienced_provider_id": _winner("completed_bookings", lowest_wins=False),
            "most_availability_provider_id": _winner("open_slots_on_date", lowest_wins=False),
        }
        return sheet, flags

    def process(self, providers: list, state: dict, db: Session, logger: AgentExecutionLog) -> dict:
        """Returns {provider_id: smart_match_dict}. Never raises — falls back to rules."""
        if not providers:
            return {}

        language = state.get("language", "english")
        service = state.get("service_type", "service")
        urgency = state.get("booking_type") or "not specified"
        booking_date = state.get("booking_date")

        sheet, flags = self._build_fact_sheet(providers, db)

        system_instruction = f"""
You are the Smart Match reasoning engine for Karigar AI, a home-service booking platform.

You are given a fact sheet of {len(sheet)} {service} providers already shortlisted for a user, plus the user's request context. REASON about why each provider is a good fit for THIS user and produce a short, convincing "smart match" explanation for each one.

HOW TO REASON:
- Weigh the factors (proximity, price, rating, availability, experience/speed) against the user's needs. If the booking is urgent, proximity and quick availability matter more. Otherwise rating and price carry more weight.
- DIFFERENTIATE: each provider should highlight DIFFERENT strengths where possible, so the user sees a genuine comparison (e.g. one is closest, another is cheapest, another is highest rated). Use the comparative_flags to know who wins on each factor.
- Pick the 2-3 factors where each provider is strongest relative to the others.

GROUNDING RULES (critical):
- Cite ONLY the numbers/facts in the fact sheet. NEVER invent certifications, brands, job counts, or skills that are not provided.
- If a fact is null/missing, do not mention it.
- "completed_bookings" = jobs done on the platform → use for experience. "open_slots_on_date" = how many time slots are free that day → use for availability/speed.
- "factor" MUST be one of: proximity | price | rating | availability | experience | speed.

OUTPUT — return ONLY this JSON object (reply text in {language}):
{{
  "top_pick_provider_id": <id of the single best overall match>,
  "reasoning_summary": "One sentence on why the top pick is best, in {language}.",
  "providers": [
    {{
      "provider_id": <id>,
      "headline": "Short headline e.g. 'Best for urgent repair', in {language}",
      "confidence": 0.0-1.0,
      "match_reasons": [
        {{"factor": "proximity", "title": "2-4 word title in {language}", "description": "One sentence citing a concrete fact, in {language}."}}
      ]
    }}
  ]
}}
Include every provider from the fact sheet in the "providers" array.
"""

        prompt = json.dumps({
            "user_request": {
                "service_type": service,
                "urgency": urgency,
                "booking_date": booking_date,
                "language": language,
            },
            "providers_fact_sheet": sheet,
            "comparative_flags": flags,
        }, ensure_ascii=False)

        try:
            response_text = _call_llm(
                system_instruction=system_instruction,
                prompt=prompt,
                json_mode=True,
                max_tokens=2048,
                temperature=0.3,
            )
            result = json.loads(response_text)
            top_pick = result.get("top_pick_provider_id")
            summary = result.get("reasoning_summary")

            mapped = {}
            for entry in result.get("providers", []):
                pid = entry.get("provider_id")
                if pid is None:
                    continue
                reasons = [
                    r for r in entry.get("match_reasons", [])
                    if isinstance(r, dict) and r.get("factor") in self.VALID_FACTORS
                ][:3]
                mapped[pid] = {
                    "headline": entry.get("headline"),
                    "confidence": entry.get("confidence"),
                    "match_reasons": reasons,
                    "is_top_pick": pid == top_pick,
                    "reasoning_summary": summary if pid == top_pick else None,
                }

            # Backfill any provider the LLM skipped with a deterministic card.
            for s in sheet:
                if s["provider_id"] not in mapped:
                    mapped[s["provider_id"]] = self._fallback_card(s, flags)

            logger.add_log(self.name, "Smart Match Generated", {
                "providers": list(mapped.keys()),
                "top_pick": top_pick,
            })
            return mapped
        except Exception as e:
            log.error(f"SmartMatch failed, using rule-based fallback: {str(e)[:100]}")
            logger.add_log(self.name, "Fallback (rule-based)", str(e)[:80])
            return {s["provider_id"]: self._fallback_card(s, flags) for s in sheet}

    def _fallback_card(self, s: dict, flags: dict) -> dict:
        """Deterministic, grounded card so the FE always has something credible to show."""
        pid = s["provider_id"]
        reasons = []
        if flags.get("closest_provider_id") == pid and s.get("distance_km") is not None:
            reasons.append({"factor": "proximity", "title": "Closest to You",
                            "description": f"Nearest of your matches — about {s['distance_km']} km away."})
        if flags.get("cheapest_provider_id") == pid and s.get("hourly_rate") is not None:
            reasons.append({"factor": "price", "title": "Best Price",
                            "description": f"Most affordable option at Rs. {int(s['hourly_rate'])}/hr."})
        if flags.get("highest_rated_provider_id") == pid and s.get("rating") is not None:
            reasons.append({"factor": "rating", "title": "Highest Rated",
                            "description": f"Top rated of your matches at {s['rating']}/5."})
        if flags.get("most_experienced_provider_id") == pid and s.get("completed_bookings"):
            reasons.append({"factor": "experience", "title": "Most Experienced",
                            "description": f"Completed {s['completed_bookings']} jobs on Karigar."})
        if not reasons:
            if s.get("rating") is not None:
                reasons.append({"factor": "rating", "title": "Trusted Pro",
                                "description": f"Rated {s['rating']}/5 by customers."})
            if s.get("distance_km") is not None:
                reasons.append({"factor": "proximity", "title": "Nearby",
                                "description": f"About {s['distance_km']} km from your location."})
        return {
            "headline": None,
            "confidence": None,
            "match_reasons": reasons[:3],
            "is_top_pick": False,
            "reasoning_summary": None,
        }


# ============================================================
# Agent 3: Booking Confirmation (Conversational)
# ============================================================

class BookingConfirmationAgent:
    """Handles the confirming_booking phase: shows pricing, handles confirm/change/cancel via LLM."""

    def __init__(self):
        self.name = "Booking Confirmation Agent"

    def analyze_user_intent(self, message: str, booking_summary: dict, available_slots: list, language: str, logger: AgentExecutionLog) -> dict:
        """Use LLM to understand what the user wants during confirmation phase."""

        slots_str = ", ".join(available_slots) if available_slots else "none"

        system_instruction = f"""
You are analyzing a user's response during a booking confirmation step for Karigar AI (home service platform).

The user was shown this booking summary:
- Provider: {booking_summary.get('provider_name')}
- Date: {booking_summary.get('date')}
- Time Slot: {booking_summary.get('slot')}
- Hourly Rate: Rs. {booking_summary.get('hourly_rate')}/hr
- Location: {booking_summary.get('location')}

Available time slots for this provider on this date: [{slots_str}]

Determine the user's intent from their message. Return ONLY a JSON object:
{{
  "action": "confirm" | "change_time" | "change_provider" | "change_intent" | "reject" | "cancel" | "clarify",
  "new_time": "The new time slot if action is change_time, else null",
  "reply": "A short conversational reply in {language}"
}}

Rules:
- "confirm": user CLEARLY agrees — yes/haan/theek hai/book karo/confirm/done/ok
- "change_time": user wants a different time. Extract the new time. If the requested time is not in available slots, set new_time to null and list available options in your reply.
- "change_provider": user explicitly asks for other/new providers — doosra dikhao/koi aur/change provider/different one
- "change_intent": user wants a completely different service (e.g., "mujhe plumber chahiye instead", "actually I need electrician")
- "reject": user declines THIS booking but is NOT abandoning the search — no/nahi/ye nahi/ye wala nahi/I don't want this one/mujhe ye nahi chahiye. They should go back to pick another provider.
- "cancel": user wants to abandon the whole thing — cancel/band karo/rehne do/forget it/no thanks/abhi nahi.
- NEVER default to "confirm". Only use "confirm" when the user clearly agrees. A plain "no"/"nahi" is a "reject", not a "confirm". If the intent is genuinely unclear, set action to "clarify" and ask what they'd like to do.
- Reply MUST be in {language}.
- If replying in Roman Urdu, use ONLY Pakistani Urdu words. NEVER use Hindi words (swagat, dhanyavaad, sahayata, kripya). Use Pakistani equivalents (khush aamdeed, shukriya, madad, meharbani).
"""

        try:
            response_text = _call_llm(
                system_instruction=system_instruction,
                prompt=f"User's message: \"{message}\"",
                json_mode=True,
                temperature=0.1,
            )
            result = json.loads(response_text)
            logger.add_log(self.name, "Analyze User Intent", result)
            return result
        except Exception as e:
            log.error(f"BookingConfirmation LLM failed: {str(e)[:100]}")
            # Safe default: never auto-confirm/book on failure — ask the user to clarify.
            return {"action": "clarify", "new_time": None, "reply": ""}

    def create_booking(self, user_id: int, provider_id: int, slot: str, booking_date: str, db: Session, logger: AgentExecutionLog) -> dict:
        """Actually create the booking in DB."""
        provider = db.query(Provider).filter(Provider.id == provider_id).first()
        if not provider:
            return {"status": "failed", "message": "Provider not found."}

        try:
            slots_data = json.loads(provider.available_slots) if provider.available_slots else {}
        except (json.JSONDecodeError, TypeError):
            slots_data = {}

        if isinstance(slots_data, list):
            today_str = datetime.now().strftime("%Y-%m-%d")
            slots_data = {today_str: slots_data} if slots_data else {}
            if not booking_date:
                booking_date = today_str

        date_slots = slots_data.get(booking_date, [])
        if slot not in date_slots:
            return {
                "status": "failed",
                "message": "This slot is no longer available.",
                "remaining_slots": date_slots
            }

        date_slots.remove(slot)
        if date_slots:
            slots_data[booking_date] = date_slots
        else:
            del slots_data[booking_date]
        provider.available_slots = json.dumps(slots_data)

        new_booking = Booking(
            user_intent=f"Booked {provider.service_type}",
            user_id=user_id,
            provider_id=provider_id,
            time_slot=slot,
            booking_date=booking_date,
            status="Confirmed",
            service_type=provider.service_type,
            price=provider.hourly_rate or 500,
        )
        db.add(new_booking)
        db.commit()
        db.refresh(new_booking)

        logger.add_log(self.name, "Booking Created", {
            "booking_id": new_booking.id, "provider": provider.name,
            "date": booking_date, "slot": slot
        })

        return {
            "status": "confirmed",
            "booking_id": new_booking.id,
            "provider_name": provider.name,
            "provider_location": provider.location,
            "booking_date": booking_date,
            "slot": slot,
            "rating": provider.rating,
            "hourly_rate": provider.hourly_rate or 500
        }


# ============================================================
# Agent 4: Follow-Up
# ============================================================

class FollowUpAgent:
    def __init__(self):
        self.name = "Follow-Up Agent"

    def process(self, booking_data: dict, language: str, logger: AgentExecutionLog):
        if booking_data.get("status") != "confirmed":
            return {"follow_up": None}
        result = {"follow_up_scheduled": True, "reminder": "1 hour before appointment"}
        logger.add_log(self.name, "Reminder Scheduled", result)
        return result


# ============================================================
# Agent 5: Chat Summarizer (Background)
# ============================================================

class ChatSummarizerAgent:
    def __init__(self):
        self.name = "Chat Summarizer"

    def summarize(self, session_id: int, booking_id: int):
        db = SessionLocal()
        try:
            session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
            if not session:
                log.error(f"ChatSummarizer: Session {session_id} not found.")
                return

            booking = db.query(Booking).filter(Booking.id == booking_id).first()
            if not booking:
                log.error(f"ChatSummarizer: Booking {booking_id} not found.")
                return

            messages = [{"role": msg.role, "content": msg.content} for msg in session.messages]

            if not messages:
                return

            convo = ""
            for m in messages:
                role = "User" if m["role"] == "user" else "Assistant"
                convo += f"{role}: {m['content']}\n"

            user = booking.user
            user_name = (user.name if user and user.name else None) or "User"
            user_address = (user.address if user and user.address else None) or (user.location if user and user.location else None)

            system_instruction = (
                "You are a helpful summarizer for Karigar AI. "
                "Analyze the following conversation and write a single, plain text paragraph summarizing the interaction in Roman Urdu (Urdu written using English/Latin letters). "
                "You MUST write the entire summary in Roman Urdu, NOT in English or Urdu script. "
                "You MUST NOT use bullet points, numbered lists, asterisks, bold text, or headings. "
                "Refer to the user by their actual name (provided below) instead of saying 'user', and mention their address/location where the service is needed. "
                "Your summary should naturally explain what the user wanted, why they reached out, which specific service provider they booked, and for what date and time. "
                "Example format: 'Ahmed Khan ne plumbing service book karne ke liye contact kiya kyunki unke Gulshan wale ghar mein sink leak ho raha tha. Unhone Ali Raza ko 25 May ko 14:00 baje ke liye successfully book kiya.' "
                "Return ONLY the plain text paragraph in Roman Urdu."
            )
            user_details = f"User Name: {user_name}\n"
            if user_address:
                user_details += f"User Address: {user_address}\n"
            prompt = f"{user_details}\nConversation:\n{convo}"

            summary_text = _call_llm(
                system_instruction=system_instruction,
                prompt=prompt,
                temperature=0.3,
                json_mode=False
            )

            booking.prompt = summary_text.strip()
            db.commit()
            log.info(f"ChatSummarizer: Successfully summarized session {session_id} for booking {booking_id}")
        except Exception as e:
            log.error(f"ChatSummarizer failed: {e}")
        finally:
            db.close()


# ============================================================
# Agent 6: Cancellation Agent
# ============================================================

class CancellationAgent:
    """Handles booking cancellation through conversation.

    Sub-phases managed via session state["cancel_phase"]:
        identify  -> user's bookings are fetched, shown, awaiting selection
        confirm   -> user selected a booking, awaiting yes/no confirmation
    """

    def __init__(self):
        self.name = "Cancellation Agent"

    def get_user_bookings(self, user_id: int, db: Session, logger: AgentExecutionLog):
        today_str = datetime.now().strftime("%Y-%m-%d")
        bookings = (
            db.query(Booking)
            .filter(
                Booking.user_id == user_id,
                Booking.status == "Confirmed",
                Booking.booking_date >= today_str,
            )
            .order_by(Booking.booking_date.asc())
            .limit(5)
            .all()
        )
        logger.add_log(self.name, "Fetch Upcoming Bookings", f"Found {len(bookings)} upcoming confirmed bookings for user {user_id}")
        results = []
        for b in bookings:
            provider = db.query(Provider).filter(Provider.id == b.provider_id).first()
            results.append({
                "booking_id": b.id,
                "service_type": b.service_type,
                "provider_name": provider.name if provider else "Unknown",
                "provider_id": b.provider_id,
                "date": b.booking_date,
                "slot": b.time_slot,
                "price": b.price,
            })
        return results

    def cancel_booking(self, booking_id: int, user_id: int, db: Session, logger: AgentExecutionLog):
        booking = db.query(Booking).filter(Booking.id == booking_id, Booking.user_id == user_id).first()
        if not booking:
            logger.add_log(self.name, "Cancel Failed", f"Booking {booking_id} not found for user {user_id}")
            return {"status": "failed", "message": "Booking not found."}

        if booking.status != "Confirmed":
            logger.add_log(self.name, "Cancel Failed", f"Booking {booking_id} is already {booking.status}")
            return {"status": "failed", "message": f"Booking is already {booking.status}."}

        # Restore the slot to provider's available_slots
        provider = db.query(Provider).filter(Provider.id == booking.provider_id).first()
        slot_restored = False
        if provider and booking.booking_date and booking.time_slot:
            try:
                slots_data = json.loads(provider.available_slots) if provider.available_slots else {}
            except (json.JSONDecodeError, TypeError):
                slots_data = {}
            if isinstance(slots_data, list):
                slots_data = {booking.booking_date: slots_data}
            day_slots = slots_data.get(booking.booking_date, [])
            if booking.time_slot not in day_slots:
                day_slots.append(booking.time_slot)
            slots_data[booking.booking_date] = day_slots
            provider.available_slots = json.dumps(slots_data)
            slot_restored = True

        booking.status = "Cancelled"
        db.commit()

        logger.add_log(self.name, "Booking Cancelled", {
            "booking_id": booking.id,
            "provider": provider.name if provider else "Unknown",
            "slot_restored": slot_restored,
        })

        # Create notification
        try:
            notification = Notification(
                title="Booking Cancelled",
                message=f"Your booking #{booking.id} with {provider.name if provider else 'provider'} on {booking.booking_date} at {booking.time_slot} has been cancelled.",
                type="booking_cancellation",
                is_read=False,
                created_at=datetime.now().isoformat(),
                user_id=user_id,
                provider_id=booking.provider_id,
                booking_id=booking.id,
            )
            db.add(notification)
            db.commit()
            logger.add_log(self.name, "Notification Created", f"Cancellation notification for user {user_id}")
        except Exception as e:
            log.error(f"CancellationAgent notification failed: {str(e)[:100]}")

        return {
            "status": "cancelled",
            "booking_id": booking.id,
            "provider_name": provider.name if provider else "Unknown",
            "date": booking.booking_date,
            "slot": booking.time_slot,
        }

    def analyze_selection(self, message: str, bookings: list, language: str, logger: AgentExecutionLog):
        """Use LLM to figure out which booking the user wants to cancel."""
        booking_lines = ""
        for i, b in enumerate(bookings, 1):
            booking_lines += f"{i}. Booking #{b['booking_id']}: {b['service_type']} by {b['provider_name']} on {b['date']} at {b['slot']} (Rs. {b['price']})\n"

        system_instruction = f"""You are a cancellation assistant for Karigar AI (a Pakistani home service platform).
The user has these active bookings:
{booking_lines}

The user sent a message to select which booking to cancel.
Determine which booking they mean. They might say a number (1, 2, 3), a provider name, a service type, or a date.

IMPORTANT: If replying in Roman Urdu, use ONLY Pakistani Urdu words. NEVER use Hindi words like "swagat", "dhanyavaad", "sahayata", "kripya". Use Pakistani equivalents: "shukriya", "madad", "meharbani".

Return ONLY a JSON object:
{{
  "selected_booking_id": <the booking_id integer they selected, or null if unclear>,
  "reply": "A short confirmation question in {language} asking if they really want to cancel this specific booking. Include the provider name, date, and time in the confirmation."
}}

If you cannot determine which booking, set selected_booking_id to null and ask them to clarify.
"""
        try:
            response_text = _call_llm(
                system_instruction=system_instruction,
                prompt=f"User's message: \"{message}\"",
                json_mode=True, temperature=0.1,
            )
            result = json.loads(response_text)
            logger.add_log(self.name, "Selection Analysis", result)
            return result
        except Exception:
            return {"selected_booking_id": None, "reply": "Could you clarify which booking you'd like to cancel?"}

    def analyze_confirmation(self, message: str, language: str, logger: AgentExecutionLog):
        """Use LLM to determine if user confirmed or denied cancellation."""
        system_instruction = f"""You are analyzing a user's response to a cancellation confirmation for Karigar AI (Pakistani platform).
The user was asked "Are you sure you want to cancel this booking?"
Determine their intent.

IMPORTANT: If replying in Roman Urdu, use ONLY Pakistani Urdu words. NEVER use Hindi words like "swagat", "dhanyavaad", "sahayata". Use Pakistani equivalents: "shukriya", "madad", "meharbani".

Return ONLY a JSON object:
{{
  "action": "yes" | "no",
  "reply": "A short response in {language}"
}}

- "yes": user confirms cancellation (haan, yes, ok, confirm, kar do, cancel karo, ha)
- "no": user declines (nahi, no, rehne do, nah, mat karo, ruko)
"""
        try:
            response_text = _call_llm(
                system_instruction=system_instruction,
                prompt=f"User's message: \"{message}\"",
                json_mode=True, temperature=0.1,
            )
            result = json.loads(response_text)
            logger.add_log(self.name, "Confirmation Analysis", result)
            return result
        except Exception:
            return {"action": "no", "reply": "Theek hai, booking cancel nahi ki."}


# ============================================================
# Agent 7: Feedback / Review Agent (Background)
# ============================================================

class FeedbackReviewAgent:
    """Runs after a user completes a booking and leaves a rating/comment.

    1. Judges the comment's tone via the LLM (sentiment in [-1, 1]).
    2. Derives a sentiment-adjusted "effective" rating from the raw star + tone.
    3. Recomputes the provider's overall rating as the average of effective
       scores across all completed, rated bookings (idempotent / self-healing).
    4. Notifies the provider of the new review and updated average.

    Follows the ChatSummarizerAgent pattern: opens its own DB session, never
    raises (so it can run fire-and-forget in a background thread).
    """

    # How hard the comment's tone is allowed to move the star rating.
    NEG_NUDGE = 1.0   # a negative comment can pull a rating down by up to 1.0
    POS_NUDGE = 0.5   # a positive comment can lift a rating by up to 0.5

    def __init__(self):
        self.name = "Feedback / Review Agent"

    def _analyze_sentiment(self, comment: str) -> dict:
        """Return {sentiment: float[-1,1], label: str, summary: str}. Safe defaults on failure."""
        if not comment or not comment.strip():
            return {"sentiment": 0.0, "label": "neutral", "summary": ""}

        system_instruction = """
You analyze a customer's review comment for a home-service booking on Karigar AI.
Judge ONLY the tone of the comment. Comments may be in English, Roman Urdu, or Urdu.

Return ONLY a JSON object:
{
  "sentiment": <float between -1.0 (very negative) and 1.0 (very positive), 0.0 = neutral>,
  "label": "positive" | "neutral" | "negative",
  "summary": "A neutral one-line summary of the feedback in English (max 15 words)."
}
"""
        try:
            response_text = _call_llm(
                system_instruction=system_instruction,
                prompt=f"Review comment: \"{comment.strip()}\"",
                json_mode=True,
                max_tokens=200,
                temperature=0.0,
            )
            result = json.loads(response_text)
            sentiment = float(result.get("sentiment", 0.0))
            sentiment = max(-1.0, min(1.0, sentiment))  # clamp
            return {
                "sentiment": sentiment,
                "label": result.get("label", "neutral"),
                "summary": (result.get("summary") or "").strip(),
            }
        except Exception as e:
            log.warning(f"FeedbackReview: sentiment analysis failed ({str(e)[:80]}), treating as neutral.")
            return {"sentiment": 0.0, "label": "neutral", "summary": ""}

    def _compute_effective_rating(self, star: float, comment: str, sentiment: float) -> float:
        """Blend the raw star with the comment's tone.

        - Star + comment: nudge the star by the tone (bad pulls harder than good lifts).
        - Star only:      use the star as-is.
        - Comment only:   derive a rating from tone, centred on 3.
        """
        has_comment = bool(comment and comment.strip())

        if star is not None and has_comment:
            nudge = sentiment * (self.NEG_NUDGE if sentiment < 0 else self.POS_NUDGE)
            effective = star + nudge
        elif star is not None:
            effective = star
        else:  # comment only
            effective = 3.0 + sentiment * 2.0

        return round(max(1.0, min(5.0, effective)), 1)

    def _recompute_provider_rating(self, provider: Provider, db: Session) -> float:
        """Average effective scores (falling back to raw star) over completed, rated bookings."""
        rated = (
            db.query(Booking)
            .filter(
                Booking.provider_id == provider.id,
                Booking.status == "Completed",
            )
            .all()
        )
        scores = []
        for b in rated:
            score = b.effective_rating if b.effective_rating is not None else b.customer_rating
            if score is not None:
                scores.append(score)

        if not scores:
            return provider.rating

        new_rating = round(sum(scores) / len(scores), 1)
        provider.rating = new_rating
        return new_rating

    def _notify_provider(self, provider: Provider, booking: Booking, new_rating: float,
                         star: float, summary: str, db: Session):
        """Record + push a notification to the provider about the new review."""
        star_txt = f"{star:g}⭐ " if star is not None else ""
        detail = f' — "{summary}"' if summary else ""
        title = "New Review Received"
        body = (
            f"You received a {star_txt}review on your {booking.service_type or 'service'} booking "
            f"(#{booking.id}){detail}. Your overall rating is now {new_rating}/5."
        )
        try:
            notification = Notification(
                title=title,
                message=body,
                type="review_received",
                is_read=False,
                created_at=datetime.now().isoformat(),
                user_id=booking.user_id,
                provider_id=provider.id,
                booking_id=booking.id,
            )
            db.add(notification)
            db.commit()
        except Exception as e:
            log.error(f"FeedbackReview: notification record failed ({str(e)[:80]})")
            db.rollback()

        if provider.device_token:
            try:
                # Lazy import to avoid a circular import at module load time.
                from bookings_notifications import trigger_push_notification
                trigger_push_notification(
                    device_token=provider.device_token,
                    title=title,
                    message=body,
                    data={"booking_id": str(booking.id), "type": "review_received",
                          "new_rating": str(new_rating)},
                )
            except Exception as e:
                log.error(f"FeedbackReview: push dispatch failed ({str(e)[:80]})")

    def process(self, booking_id: int):
        """Entry point — safe to call in a background thread. Opens its own DB session."""
        db = SessionLocal()
        try:
            booking = db.query(Booking).filter(Booking.id == booking_id).first()
            if not booking:
                log.error(f"FeedbackReview: Booking {booking_id} not found.")
                return

            star = booking.customer_rating
            comment = booking.customer_feedback
            if star is None and not (comment and comment.strip()):
                log.info(f"FeedbackReview: Booking {booking_id} has no rating or comment, skipping.")
                return

            sentiment_data = self._analyze_sentiment(comment)
            effective = self._compute_effective_rating(star, comment, sentiment_data["sentiment"])
            booking.effective_rating = effective
            db.commit()

            provider = db.query(Provider).filter(Provider.id == booking.provider_id).first()
            if not provider:
                log.error(f"FeedbackReview: Provider {booking.provider_id} not found.")
                return

            new_rating = self._recompute_provider_rating(provider, db)
            db.commit()

            log.info(
                f"FeedbackReview: Booking {booking_id} | star={star} "
                f"sentiment={sentiment_data['sentiment']:+.2f} ({sentiment_data['label']}) "
                f"-> effective={effective} | Provider {provider.id} rating -> {new_rating}"
            )

            self._notify_provider(provider, booking, new_rating, star,
                                  sentiment_data.get("summary", ""), db)
        except Exception as e:
            log.error(f"FeedbackReviewAgent failed: {e}")
            db.rollback()
        finally:
            db.close()


# ============================================================
# Orchestrator V2 (Phase-based)
# ============================================================

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

    def _route(self, message, user_id, db, session_id, latitude, longitude, location_name,
               selected_provider_id, selected_slot, selected_date,
               selected_cancel_booking_id, logger):
        user = db.query(User).filter(User.id == user_id).first() if user_id else None
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

        # --- CHANGE INTENT ---
        elif action == "change_intent":
            reply = analysis.get("reply") or "Theek hai, batayein aapko kya service chahiye?"
            new_state = {"language": language, "phase": PHASE_GATHERING}
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
