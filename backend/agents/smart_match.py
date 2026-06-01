"""Agent 2b - Smart Match: ranks/scores discovered providers for the user."""

import json
import time
from sqlalchemy import func
from sqlalchemy.orm import Session
from models import Provider, Booking
from .llm import _call_llm, log
from .common import AgentExecutionLog


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
                agent=self.name,
                tracer=logger,
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
