"""Agent 1 - Intent Validation: turns a raw user message into structured intent."""

import json
from datetime import datetime, timedelta
from models import User
from .llm import _call_llm, log
from .common import AgentExecutionLog


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
- Once service_type is confirmed: Ask about timing — whether they need it today or on another day. Phrase this question in the SAME language as the user's latest message (see LANGUAGE MIRRORING). Examples of the SAME question in each language — pick the one matching the user's current language
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
                agent=self.name,
                tracer=logger,
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
