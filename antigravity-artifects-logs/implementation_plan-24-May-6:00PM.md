# Implement Cancellation Agent and Chat Summarizer

The booking flow currently has no cancellation path and no post-booking summary for providers. We need a **Cancellation Agent** that safely cancels bookings and restores freed slots, plus a **Chat Summarizer Agent** that writes a Roman-Urdu summary onto the booking for the provider portal.

> [!IMPORTANT]
> **User Review Required:** Cancellation restores the freed slot to the provider's availability — this is a write operation that must be atomic to prevent ghost slots. The Chat Summarizer runs as a background thread with its own DB session; verify it never interferes with the foreground booking response.

## Proposed Steps

### 1. Build Cancellation Agent

Implement a three-step cancellation flow:
- **Identify** — fetch user's active bookings (today onward) via `get_user_bookings()`
- **Confirm** — present the booking details and ask for explicit cancellation confirmation
- **Cancel** — mark booking as cancelled + restore the freed slot to the provider's `available_slots`

Both operations (cancel + restore slot) must execute in a single transaction.

### 2. Build Chat Summarizer Agent (Background)

After a booking is confirmed:
- Spawn a background thread with its own DB session
- Summarize the full conversation in **Roman Urdu** (matching the user's likely language)
- Write the summary to `booking.prompt` for the provider-facing portal
- Fire-and-forget: log and swallow errors so it never blocks the foreground

### 3. Wire into Orchestrator

- Add `cancelling_booking` phase to the FSM
- Teach the Intent Agent to detect cancellation intent
- Route cancellation turns through the Orchestrator → Cancellation Agent pipeline

## Verification Plan

### Automated Tests
- Test cancel + slot restoration atomicity (verify slot reappears)
- Test cancellation of non-existent booking returns graceful error
- Test summarizer produces Roman-Urdu output
- Verify background thread uses its own DB session

### Manual Verification
- Book a provider, then cancel — verify the slot is available again for a new booking
- Check `booking.prompt` contains a coherent Roman-Urdu summary
- Verify cancellation triggers FCM push notification to user
