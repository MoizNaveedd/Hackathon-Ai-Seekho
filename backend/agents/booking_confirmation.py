"""Agent 3 - Booking Confirmation: drives the conversational confirm-and-book step."""

import json
import time
from datetime import datetime
from sqlalchemy.orm import Session
from models import Provider, Booking, User
from .llm import _call_llm, log
from .common import AgentExecutionLog


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
                agent=self.name,
                tracer=logger,
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
