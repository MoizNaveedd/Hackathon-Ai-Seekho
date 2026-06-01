"""Agent 8 - Orchestrator: top-level router / agentic brain that picks the next move."""

import json
import time
from models import User
from .llm import _call_llm, log
from .common import AgentExecutionLog


class OrchestratorAgent:
    """Top-level router. Reasons about each user turn and decides the next action.

    This is the agentic 'brain' that sits ABOVE the phase state machine: the LLM
    decides WHICH lane the turn belongs to — answer a general question, or proceed
    with the booking/cancellation flow. The phase machine then guards the rails
    within the chosen lane. Conservatively biased toward 'proceed_flow' and never
    raises — on any error it defaults to 'proceed_flow' (i.e. today's behavior).
    """

    VALID_ACTIONS = {"answer_question", "proceed_flow"}

    def __init__(self):
        self.name = "Orchestrator Agent"

    def route(self, messages: list, state: dict, phase: str, logger: AgentExecutionLog) -> dict:
        known = {
            "service_type": state.get("service_type"),
            "booking_date": state.get("booking_date"),
            "has_location": bool(state.get("latitude") and state.get("longitude")),
            "providers_shown": bool(state.get("providers")),
            "booking_summary": bool(state.get("booking_summary")),
        }
        prev_language = state.get("language", "english")

        transcript = ""
        for msg in messages:
            role = "User" if msg["role"] == "user" else "Assistant"
            transcript += f"{role}: {msg['content']}\n"

        system_instruction = f"""
You are the Orchestrator for Karigar AI, a Pakistani home-service booking assistant.
You decide what to do with the user's LATEST message. You do NOT answer the user yourself.

Current phase: "{phase}"
What we already know this session: {json.dumps(known)}

Choose ONE next_action:
- "answer_question": the user is asking a GENERAL / informational question that is NOT a step in the booking flow — e.g. what services we offer, which areas we cover, how the platform works, how pricing works, who/what Karigar AI is, our capabilities.
- "proceed_flow": the message is part of the booking/cancellation flow — a service request, a date/time, a provider choice, a yes/no/confirm/cancel, a greeting that leads to booking, a location, "show more", "change provider", a location-change request, etc.

CRITICAL — "asking ABOUT a service" vs "asking FOR a service":
- Wanting a service, or SWITCHING to a different service, is ALWAYS "proceed_flow" — even mid-booking, even if it changes the current service. The booking flow handles service changes itself.
  - "I need a painter", "no I want to book a painter instead", "actually book an electrician", "change it to AC repair", "mujhe plumber nahi painter chahiye", "painter chahiye" -> proceed_flow
- "answer_question" is ONLY for a purely INFORMATIONAL question that does NOT ask to book anything:
  - "do you also do pest control?", "what services do you offer?", "how does pricing work?", "what areas do you cover?", "who are you?" -> answer_question
- Rule of thumb: if the message expresses INTENT TO BOOK or CHANGE a service (it contains words like "book", "chahiye", "I need", "I want", "instead", "change to", or just names a service the user wants) -> "proceed_flow". If it only asks whether/what/how something exists, with no request to book -> "answer_question".

DECISION RULES (bias strongly toward "proceed_flow"):
- When in doubt, choose "proceed_flow".
- During phase "selecting_provider" or "confirming_booking", SHORT replies (e.g. "yes", "haan", "theek hai", "ok", "1", "2", a time like "3pm", a date like "kal", "no", "nahi", "doosra dikhao") are ALWAYS flow actions -> "proceed_flow".
- A request to actually book, cancel, change a service, or pick a provider is NEVER "answer_question".

Detect the language of the user's LATEST message: "english" | "roman_urdu" | "urdu".

Return ONLY a JSON object:
{{
  "reasoning": "One short sentence: why this action.",
  "next_action": "answer_question" | "proceed_flow",
  "language": "english" | "roman_urdu" | "urdu"
}}
"""
        try:
            response_text = _call_llm(
                system_instruction=system_instruction,
                prompt=f"Recent conversation:\n{transcript}\n\nDecide the next_action for the user's LATEST message.",
                json_mode=True,
                max_tokens=200,
                temperature=0.0,
                agent=self.name,
                tracer=logger,
            )
            result = json.loads(response_text)
            action = result.get("next_action")
            if action not in self.VALID_ACTIONS:
                action = "proceed_flow"
            decision = {
                "reasoning": result.get("reasoning", ""),
                "next_action": action,
                "language": result.get("language") or prev_language,
            }
            logger.add_log(self.name, "Route Decision", decision)
            return decision
        except Exception as e:
            log.warning(f"Orchestrator routing failed ({str(e)[:80]}), proceeding with flow.")
            logger.add_log(self.name, "Route Decision (fallback)", {"next_action": "proceed_flow"})
            return {"next_action": "proceed_flow", "language": prev_language, "reasoning": "fallback"}
