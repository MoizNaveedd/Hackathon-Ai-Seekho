"""Agent 9 - Concierge: answers general, grounded questions about the service."""

import json
import time
from sqlalchemy.orm import Session
from models import User
from .llm import _call_llm, log
from .common import get_service_catalog, PHASE_SELECTING, PHASE_CONFIRMING, AgentExecutionLog


class ConciergeAgent:
    """Answers general / off-script questions (services, coverage, pricing model,
    identity, how-it-works) WITHOUT leaving the current booking flow. Grounded:
    cites only the real service catalog and platform facts — never invents
    specific providers, prices, certifications, or coverage areas.
    """

    def __init__(self):
        self.name = "Concierge Agent"

    def answer(self, messages: list, state: dict, phase: str, language: str,
               db: Session, logger: AgentExecutionLog) -> dict:
        language = language or state.get("language", "english")
        services = ", ".join(get_service_catalog(db))

        transcript = ""
        for msg in messages:
            role = "User" if msg["role"] == "user" else "Assistant"
            transcript += f"{role}: {msg['content']}\n"

        in_flow = phase in (PHASE_SELECTING, PHASE_CONFIRMING)
        nudge = (
            "The user is in the MIDDLE of a booking — after answering, gently invite them "
            "to continue where they left off."
            if in_flow else
            "After answering, gently invite them to tell you what service they need."
        )

        system_instruction = f"""
You are the friendly, knowledgeable assistant for Karigar AI, a home-service booking platform in Pakistan.
Answer the user's question warmly, clearly, and helpfully. You speak Urdu, Roman Urdu, and English.

SELF-REFERENCE: When you refer to yourself, say you are "Karigar AI ka assistant" / "Karigar AI's assistant" (or just "Karigar AI"). NEVER call yourself a "concierge" — that is an internal label and must never appear in your reply.

You handle TWO kinds of question — keep them separate:

1) GENERAL TRADE KNOWLEDGE (you MAY use your own knowledge here):
- If the user asks what a service/trade does (e.g. "what does a plumber do?", "electrician kya kaam karta hai?", "AC technician kis cheez mein madad karta hai?"), explain the COMMON, everyday tasks that professional honestly handles — using general real-world knowledge.
  - e.g. a plumber: leaks, pipe & tap repairs, drain blockages, water-tank and bathroom/kitchen fittings.
  - e.g. an electrician: wiring, switches/sockets, breaker/fuse faults, light & fan installation, power issues.
- Be genuinely informative and intelligent — it is fine to list a few typical tasks. Only describe things that trade REALISTICALLY does. If unsure whether a specific task falls under a trade, say it's best to ask the provider.

2) PLATFORM-SPECIFIC FACTS (use ONLY the grounded facts below — NEVER invent):
- Services we offer: {services}.
- How it works: the user tells us what they need by chatting, we find nearby top-rated providers, the user picks one and a time slot, confirms, and gets a notification. Bookings can be cancelled anytime by chatting "cancel my booking".
- Pricing: each provider sets their own hourly rate (in PKR), so prices vary by provider. Exact rates are shown when we display matches. Do NOT quote a specific number.
- Identity: Karigar AI is an AI assistant that books trusted home-service professionals (karigars) across Pakistan.
- Coverage: we match providers near the user's location. If asked about a specific area, say we look for the nearest available providers once they share their location — do NOT promise or deny a specific city/area.

HARD GUARDRAILS (never break these):
- NEVER invent specific providers, names, prices/rates, ratings, certifications, years of experience, job counts, guarantees, warranties, or availability. Those come only from real data shown during booking.
- Do NOT claim a service exists on Karigar AI if it is not in the "Services we offer" list above.

RULES:
- Be concise but complete — up to ~5 sentences. A service explanation can be a short, helpful list of typical tasks.
- If the question is entirely unrelated to home services, politely say that's outside what you help with, and steer back.
- {nudge}

LANGUAGE: Reply in {language} (mirror the user). If Roman Urdu, use ONLY Pakistani Urdu words — NEVER Hindi words (swagat, dhanyavaad, sahayata, kripya). Use Pakistani equivalents (khush aamdeed, shukriya, madad, meharbani).

Return ONLY a JSON object:
{{
  "reply": "Your answer in {language}.",
  "language": "{language}"
}}
"""
        try:
            response_text = _call_llm(
                system_instruction=system_instruction,
                prompt=f"Recent conversation:\n{transcript}\n\nAnswer the user's latest question.",
                json_mode=True,
                max_tokens=400,
                temperature=0.4,
                agent=self.name,
                tracer=logger,
            )
            result = json.loads(response_text)
            reply = result.get("reply") or self._fallback_reply(language, services)
            out = {"reply": reply, "language": result.get("language") or language}
            logger.add_log(self.name, "General Query Answered", {"phase": phase})
            return out
        except Exception as e:
            log.error(f"Concierge failed ({str(e)[:80]}), using fallback.")
            return {"reply": self._fallback_reply(language, services), "language": language}

    def _fallback_reply(self, language, services):
        if language == "roman_urdu":
            return (f"Karigar AI ke zariye aap yeh services book kar sakte hain: {services}. "
                    f"Bataiye aapko kya chahiye?")
        elif language == "urdu":
            return (f"کریگر اے آئی کے ذریعے آپ یہ سروسز بک کر سکتے ہیں: {services}۔ "
                    f"بتائیے آپ کو کیا چاہیے؟")
        return (f"With Karigar AI you can book these services: {services}. "
                f"What do you need help with?")
