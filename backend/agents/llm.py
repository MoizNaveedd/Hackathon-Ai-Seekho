"""LLM provider abstraction (Groq primary, Gemini fallback) and the
per-call cost / trace instrumentation shared by every agent."""

import os
import time
import logging
import threading
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

# ============================================================
# LLM Cost & Trace Instrumentation
# ============================================================

# Dedicated logger for per-call LLM traces + per-request cost rollups.
# Propagates to the root logger configured in main.py, so it uses the same
# "%(asctime)s | %(name)-20s | %(levelname)-7s | %(message)s" format.
trace_log = logging.getLogger("llm.trace")

# Static pricing — USD per 1,000,000 tokens (input, output).
# Both providers are on free tiers today; these are the published list prices
# so the logs show what each request WOULD cost at scale. Tune as prices change.
LLM_PRICING = {
    "llama-3.3-70b-versatile": {"in": 0.59, "out": 0.79},
    "gemini-2.5-flash":        {"in": 0.30, "out": 2.50},
}
USD_TO_PKR = 280.0  # rough FX, for a human-readable Rs. figure in the logs

# Process-wide cumulative totals since server start. Every call — request-bound
# AND background — funnels through _record_call, so this captures everything.
# Guarded by a lock because background agents run in their own threads.
_cumulative = {"calls": 0, "input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0}
_cumulative_lock = threading.Lock()


def get_cumulative_cost() -> dict:
    """Snapshot of total LLM usage/cost since the server started (thread-safe)."""
    with _cumulative_lock:
        snap = dict(_cumulative)
    snap["cost_pkr"] = round(snap["cost_usd"] * USD_TO_PKR, 3)
    snap["cost_usd"] = round(snap["cost_usd"], 6)
    return snap


def _extract_usage(provider: str, response) -> tuple:
    """Pull (input_tokens, output_tokens) out of a provider's raw response.
    Returns (0, 0) if the SDK shape is unexpected — never raises."""
    try:
        if provider == "groq":
            u = response.usage
            return (u.prompt_tokens or 0, u.completion_tokens or 0)
        if provider == "gemini":
            u = response.usage_metadata
            return (u.prompt_token_count or 0, (u.candidates_token_count or 0))
    except Exception:
        pass
    return (0, 0)


def _compute_cost(model: str, in_tok: int, out_tok: int) -> float:
    """USD cost for a single call from the static pricing table."""
    p = LLM_PRICING.get(model)
    if not p:
        return 0.0
    return in_tok / 1_000_000 * p["in"] + out_tok / 1_000_000 * p["out"]


def _record_call(tracer, agent: str, provider: str, model: str, response,
                 started: float, fell_back: bool, req_id: str) -> None:
    """Emit a structured per-call trace line and accumulate it on the request tracer."""
    latency_ms = int((time.perf_counter() - started) * 1000)
    in_tok, out_tok = _extract_usage(provider, response)
    cost = _compute_cost(model, in_tok, out_tok)

    # Fold into the process-wide running total (covers background calls too).
    with _cumulative_lock:
        _cumulative["calls"] += 1
        _cumulative["input_tokens"] += in_tok
        _cumulative["output_tokens"] += out_tok
        _cumulative["cost_usd"] += cost
        cum_cost = _cumulative["cost_usd"]
        cum_calls = _cumulative["calls"]

    trace_log.info(
        f"[{req_id}] {agent} | {provider}/{model} | "
        f"in={in_tok} out={out_tok} tok | "
        f"${cost:.6f} (~Rs.{cost * USD_TO_PKR:.3f}) | {latency_ms}ms"
        + (" | FALLBACK" if fell_back else "")
        + f" | cumulative: {cum_calls} calls ${cum_cost:.6f} (~Rs.{cum_cost * USD_TO_PKR:.2f})"
    )

    if tracer is not None:
        tracer.add_llm_call({
            "agent": agent,
            "provider": provider,
            "model": model,
            "input_tokens": in_tok,
            "output_tokens": out_tok,
            "cost_usd": round(cost, 6),
            "latency_ms": latency_ms,
            "fell_back": fell_back,
        })


def _call_llm(system_instruction: str, prompt: str, json_mode: bool = True, max_tokens: int = 1024,
              temperature: float = 0.2, agent: str = "Unknown Agent", tracer=None) -> str:
    """Call LLM with automatic fallback: Groq (primary) -> Gemini (fallback).

    `agent` labels the caller in the trace logs; `tracer` is the request's
    AgentExecutionLog (when available) so per-call cost rolls up into a request total.
    """
    req_id = tracer.request_id if tracer is not None else "background"

    # --- Try Groq first (faster, higher free quota) ---
    if groq_client:
        started = time.perf_counter()
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
            _record_call(tracer, agent, "groq", GROQ_MODEL, response, started, False, req_id)
            return response.choices[0].message.content
        except Exception as e:
            error_msg = str(e)
            log.warning(f"LLM: Groq failed ({error_msg[:80]}), falling back to Gemini...")

    # --- Fallback to Gemini ---
    if gemini_client:
        started = time.perf_counter()
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
            # If Groq exists, reaching here means Groq was tried and failed -> fallback.
            _record_call(tracer, agent, "gemini", GEMINI_MODEL, response, started,
                         bool(groq_client), req_id)
            return response.text
        except Exception as e:
            error_msg = str(e)
            log.error(f"LLM: Gemini also failed ({error_msg[:80]})")


    raise Exception("No LLM provider available. Set GEMINI_API_KEY or GROQ_API_KEY in .env.")
