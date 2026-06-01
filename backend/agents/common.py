"""Cross-agent shared building blocks: phase constants, the service
catalog, the haversine helper, the per-request AgentExecutionLog, and the
rolling-window context helpers."""

import math
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from models import Provider
from .llm import (
    log,
    _call_llm,
    trace_log,
    USD_TO_PKR,
    get_cumulative_cost,
)

# ============================================================
# Constants
# ============================================================

MAX_RECENT_MESSAGES = 6

# Fallback service list — used only if the DB has no providers yet or is unreachable.
# The live catalog comes from get_service_catalog() (distinct provider.service_type).
SERVICE_CATALOG = [
    "AC Technician", "Plumber", "Electrician", "Beautician", "Painter",
    "Carpenter", "Appliance Repair", "Pest Control", "Home Cleaning", "Locksmith",
]

# Cached live catalog so we don't hit the DB on every Concierge answer.
_service_catalog_cache = {"services": None, "ts": 0.0}
_SERVICE_CACHE_TTL = 300  # seconds


def get_service_catalog(db: Session) -> list:
    """Live list of bookable services = DISTINCT provider.service_type from the DB,
    cached for a few minutes. Falls back to SERVICE_CATALOG when the DB is empty or
    unreachable, so answers stay grounded in what we can actually book right now."""
    now = datetime.now().timestamp()
    cached = _service_catalog_cache["services"]
    if cached and (now - _service_catalog_cache["ts"] < _SERVICE_CACHE_TTL):
        return cached
    try:
        rows = db.query(Provider.service_type).distinct().all()
        services = sorted({r[0].strip() for r in rows if r[0] and r[0].strip()})
        if services:
            _service_catalog_cache["services"] = services
            _service_catalog_cache["ts"] = now
            return services
    except Exception as e:
        log.warning(f"Service catalog DB fetch failed ({str(e)[:80]}), using static fallback.")
    return SERVICE_CATALOG

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
        # Per-request LLM trace: short id ties all of this request's log lines
        # together, and llm_calls accumulates each call for the cost rollup.
        self.request_id = uuid.uuid4().hex[:8]
        self.llm_calls = []

    def add_log(self, agent_name, action, result):
        self.logs.append({
            "agent": agent_name,
            "action": action,
            "result": result,
            "timestamp": datetime.now().isoformat()
        })

    def add_llm_call(self, record: dict):
        self.llm_calls.append(record)

    def log_llm_summary(self):
        """Emit a single per-request rollup line: call count, total tokens, total cost."""
        if not self.llm_calls:
            return
        n = len(self.llm_calls)
        in_t = sum(c["input_tokens"] for c in self.llm_calls)
        out_t = sum(c["output_tokens"] for c in self.llm_calls)
        cost = sum(c["cost_usd"] for c in self.llm_calls)
        fallbacks = sum(1 for c in self.llm_calls if c["fell_back"])
        by_agent = {}
        for c in self.llm_calls:
            by_agent[c["agent"]] = round(by_agent.get(c["agent"], 0.0) + c["cost_usd"], 6)
        cum = get_cumulative_cost()
        trace_log.info(
            f"[{self.request_id}] REQUEST TOTAL | {n} LLM call(s)"
            + (f", {fallbacks} fallback(s)" if fallbacks else "")
            + f" | in={in_t} out={out_t} tok | "
            f"${cost:.6f} (~Rs.{cost * USD_TO_PKR:.3f}) | by_agent={by_agent}"
            + f" || SERVER CUMULATIVE: {cum['calls']} calls, "
            f"in={cum['input_tokens']} out={cum['output_tokens']} tok, "
            f"${cum['cost_usd']} (~Rs.{cum['cost_pkr']})"
        )


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
            agent="Context Summarizer",
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
