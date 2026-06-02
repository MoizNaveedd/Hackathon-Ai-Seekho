# Resolution: Location Handling and Default Update

Location fallback has been updated to use **Gulshan, Karachi** as the default area, and API quota exhaustion now degrades gracefully instead of failing.

## Changes Made

### 1. Default Location Updated
- Fallback coordinates changed to Gulshan, Karachi (`24.9215, 67.0935`)
- Applied only when: user hasn't shared location AND session has no stored coordinates
- Usage logged for tracking how often the default is relied upon

### 2. Quota Error Handling
- Google Maps API `OVER_QUERY_LIMIT` error is now caught specifically
- User sees: "Location service is temporarily busy — we'll use your approximate area"
- System falls back to default coordinates and continues the flow normally

## Current Status

- **Default Location:** Gulshan, Karachi — representative of primary user base
- **Error Handling:** Quota exhaustion returns friendly message + uses fallback
- **Logging:** Default location usage is tracked for monitoring

## Next Steps

- Monitor default location usage rate — if > 40% of sessions use it, consider prompting location sharing more aggressively
- Add support for neighbourhood-level text input as location fallback ("I'm in Clifton")

> [!NOTE]
> The location fallback ensures the booking flow never stalls due to missing coordinates. Users who don't share location will see providers near Gulshan — a reasonable default for the Karachi pilot.
