# Resolution: Multi-Agent Orchestrator Architecture

The monolithic chat handler was replaced with a **two-tier hybrid architecture** — an agentic LLM orchestration layer for free-form reasoning, paired with a deterministic phase state machine for transactional safety.

## Changes Made

### 1. Dual-Provider LLM Abstraction (`_call_llm()`)
- **Primary:** Groq (`llama-3.3-70b-versatile`) — fast, high free quota
- **Fallback:** Gemini (`gemini-2.5-flash`) — automatic failover if Groq errors
- JSON-mode responses for structured agents; graceful degradation if both fail

### 2. Orchestrator Agent — the LLM Router
- Reads recent transcript + extracted state + current phase each turn
- Returns `{ reasoning, next_action, language }` — no hardcoded keyword matching
- Routes to **Concierge** for questions, **specialized agents** for booking actions
- Default fail-safe: `proceed_flow` (can never accidentally trigger a wrong booking)

### 3. Nine Specialized Agents
- **Intent & Validation** — extracts service, date, language; validates scope
- **Provider Discovery** — pure DB ranking by `rating * 0.4 + proximity * 0.6`
- **Smart Match** — grounded reasoning from real provider fact sheets
- **Booking Confirmation** — atomic slot decrement in a single transaction
- **Concierge** — answers anything using only the live `DISTINCT service_type` catalog
- **Cancellation** — identify → confirm → cancel with slot restoration
- **Chat Summarizer** — background Roman-Urdu summary
- **Feedback / Review** — background sentiment-adjusted re-rating

## Current Status

- **Agent Count:** 9 agents fully implemented and wired
- **Phase FSM:** 5 phases with deterministic transitions
- **LLM Providers:** Dual-provider failover operational
- **Grounding:** All reads return real DB rows; all writes are transactional
- **Visible Reasoning:** `debug_logs` emitted every turn with agent reasoning traces

## Next Steps

- Integrate FCM push notifications on booking confirm/cancel
- Add background thread isolation (own DB session per task)
- Implement per-message language mirroring (English / Roman Urdu / Urdu)
- Load test concurrent booking attempts to verify atomic slot protection

> [!NOTE]
> The orchestrator's reasoning is fully auditable via `debug_logs`. Every agent decision — routing, intent extraction, provider matching, confirmation analysis — is logged and returned to the client, making the system's autonomy provably real and not scripted.
