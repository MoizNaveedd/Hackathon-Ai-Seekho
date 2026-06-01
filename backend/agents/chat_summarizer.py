"""Agent 5 - Chat Summarizer (background): condenses long chat history."""

import time
from sqlalchemy.orm import Session
from models import User, Booking, ChatSession
from database import SessionLocal
from .llm import _call_llm, log


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
                json_mode=False,
                agent=self.name,
            )

            booking.prompt = summary_text.strip()
            db.commit()
            log.info(f"ChatSummarizer: Successfully summarized session {session_id} for booking {booking_id}")
        except Exception as e:
            log.error(f"ChatSummarizer failed: {e}")
        finally:
            db.close()
