"""Agent 6 - Cancellation: handles the cancel-booking flow end to end."""

import json
import time
from datetime import datetime
from sqlalchemy.orm import Session
from models import Provider, Booking, User, Notification
from .llm import _call_llm, log
from .common import AgentExecutionLog


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
                agent=self.name, tracer=logger,
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
                agent=self.name, tracer=logger,
            )
            result = json.loads(response_text)
            logger.add_log(self.name, "Confirmation Analysis", result)
            return result
        except Exception:
            return {"action": "no", "reply": "Theek hai, booking cancel nahi ki."}
