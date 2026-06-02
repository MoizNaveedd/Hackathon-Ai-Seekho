# Fix Location Handling and Update Default to Gulshan

Location handling has two issues: (1) the default location fallback is set to a test coordinate instead of a real neighbourhood, and (2) the error messaging when the Google Maps API quota is exhausted is unclear — users see a raw error instead of a helpful fallback.

> [!IMPORTANT]
> **User Review Required:** Changing the default location affects all users who haven't shared their location. The new default (Gulshan, Karachi) should be representative of the primary user base. Verify this assumption before deploying.

## Proposed Steps

### 1. Update Default Location

- Change the fallback coordinates from test values to **Gulshan, Karachi** (`24.9215, 67.0935`)
- Apply the default only when the user hasn't shared location and the session has no stored coordinates
- Log when the default is used so we can track how often users skip location sharing

### 2. Improve API Quota Exhaustion Messaging

- Catch the specific Google Maps API quota error (`OVER_QUERY_LIMIT`)
- Return a user-friendly message: "Location service is temporarily busy — we'll use your approximate area"
- Fall back to the default location gracefully instead of failing the entire turn

## Verification Plan

### Automated Tests
- Test that default coordinates match Gulshan when no location is provided
- Test quota error handling returns fallback message, not raw exception

### Manual Verification
- Start a booking without sharing location — verify Gulshan-area providers appear
- Simulate quota exhaustion and verify the fallback message is shown
