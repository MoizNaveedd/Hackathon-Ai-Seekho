# LLM Failover Test Log — 25 May

## Test: Verify Groq → Gemini failover works transparently

### Scenario 1: Groq healthy
```
Provider: Groq (llama-3.3-70b-versatile)
Latency: 340ms
Status: Success
Fallback triggered: No
```

### Scenario 2: Groq rate-limited (simulated 429)
```
Provider: Groq — FAILED (429 Too Many Requests)
Fallback: Gemini (gemini-2.5-flash)
Latency: 890ms (includes retry overhead)
Status: Success via fallback
User impact: None — response returned normally
```

### Scenario 3: Both providers down (simulated)
```
Provider: Groq — FAILED (500)
Fallback: Gemini — FAILED (503)
Deterministic fallback: Activated
Smart Match: Returned plain provider cards (no LLM reasoning)
Router: Defaulted to proceed_flow (safe direction)
User impact: Slightly less personalized cards — flow continued normally
```

### Results Summary
- Single-provider failure: **transparent** — user sees no difference
- Dual-provider failure: **graceful degradation** — deterministic cards + safe routing
- No booking was ever lost or corrupted during failover ✓
- `debug_logs` correctly indicate which provider served each turn ✓
