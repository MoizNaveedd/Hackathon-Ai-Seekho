# Karigar AI - Backend API Documentation

## Overview

Karigar AI is a multi-agent service booking platform. Users describe their problem in natural language (English, Roman Urdu, or Urdu), and the system finds the nearest available service providers with selectable time slots.

## Architecture Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND FLOW                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User opens chat                                              │
│  2. User types message (any language)                            │
│  3. FE sends POST /chat                                          │
│          │                                                       │
│          ▼                                                       │
│  4. Response received:                                           │
│     ┌─────────────────────────────────────────┐                  │
│     │ selectable: false?                      │                  │
│     │ → Show reply as chat bubble             │                  │
│     │ → Wait for next user message            │                  │
│     └─────────────────────────────────────────┘                  │
│     ┌─────────────────────────────────────────┐                  │
│     │ selectable: true?                       │                  │
│     │ → Show reply as chat bubble             │                  │
│     │ → Render provider cards with slot       │                  │
│     │   buttons                               │                  │
│     └─────────────────────────────────────────┘                  │
│          │                                                       │
│          ▼                                                       │
│  5. User taps a provider + slot                                  │
│  6. FE sends POST /book                                          │
│          │                                                       │
│          ▼                                                       │
│  7. Show confirmation message                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Base URL

```
http://localhost:8000
```

---

## Endpoints

### 1. `POST /chat` — Conversational Intent + Provider Discovery

This is the main endpoint. Send the full chat history each time the user sends a message.

#### Request

```json
{
  "messages": [
    { "role": "user", "content": "meri AC kharab ho gayi hai" }
  ],
  "user_id": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messages` | Array | Yes | Full chat history. Each message has `role` ("user" or "assistant") and `content`. |
| `user_id` | Integer | No | If provided, the system uses the user's stored location/coordinates. If null, it will ask for location. |

#### Response — Still Gathering Info

When the agent needs more information (e.g., location or service type is unclear):

```json
{
  "reply": "Aap ka location kya hai?",
  "language": "roman_urdu",
  "is_complete": false,
  "selectable": false,
  "providers": null,
  "debug_logs": [...]
}
```

**FE Action:** Display `reply` as a chat bubble. Wait for user's next message.

#### Response — Invalid Request (Hallucination/Off-topic)

When the user asks something unrelated to home services:

```json
{
  "reply": "I can only help with booking home services like plumbers, electricians, etc.",
  "language": "english",
  "is_complete": false,
  "selectable": false,
  "providers": null,
  "debug_logs": [...]
}
```

**FE Action:** Display `reply` as a chat bubble. No further action needed.

#### Response — Providers Found (Selectable)

When intent is complete and providers are available:

```json
{
  "reply": "Yeh hain aap ke nazdeek 3 AC Technician. Apna time slot select karein:",
  "language": "roman_urdu",
  "is_complete": true,
  "selectable": true,
  "providers": [
    {
      "id": 1,
      "name": "Ali AC Services",
      "location": "G-13",
      "rating": 4.8,
      "distance_km": 0.23,
      "available_slots": ["09:00 AM", "10:00 AM", "01:00 PM"]
    },
    {
      "id": 2,
      "name": "Usman Cooling Experts",
      "location": "G-11",
      "rating": 4.5,
      "distance_km": 0.25,
      "available_slots": ["04:00 PM", "06:00 PM"]
    }
  ],
  "debug_logs": [...]
}
```

**FE Action:**
1. Display `reply` as a chat bubble
2. Render provider cards below the message
3. Each card shows: name, location, rating, distance
4. Each card has selectable slot buttons (from `available_slots`)
5. When user taps a slot → call `POST /book`

#### Response — No Providers Available

```json
{
  "reply": "Sorry, no Painter is available right now. Please try again later.",
  "language": "english",
  "is_complete": true,
  "selectable": false,
  "providers": null,
  "debug_logs": [...]
}
```

**FE Action:** Display `reply` as a chat bubble.

---

### 2. `POST /book` — Confirm Booking

Called after the user selects a provider and time slot from the UI.

#### Request

```json
{
  "user_id": 1,
  "provider_id": 1,
  "slot": "10:00 AM",
  "language": "roman_urdu"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | Integer | Yes | The logged-in user's ID |
| `provider_id` | Integer | Yes | The selected provider's ID (from `/chat` response) |
| `slot` | String | Yes | The exact slot string (from `available_slots` array) |
| `language` | String | No | Language for confirmation message. Default: "english". Options: "english", "roman_urdu", "urdu" |

#### Response — Success

```json
{
  "reply": "Booking confirmed! Ali AC Services (G-13) aap ke paas 10:00 AM par aayenge. Rating: 4.8/5. Aapko 1 ghanta pehle reminder milega.",
  "status": "confirmed",
  "booking_id": 1,
  "provider_name": "Ali AC Services",
  "slot": "10:00 AM",
  "reminder": "1 hour before appointment",
  "debug_logs": [...]
}
```

**FE Action:** Display `reply` as a success message/confirmation card.

#### Response — Slot No Longer Available (Race Condition)

```json
{
  "reply": "This slot is no longer available. Please pick another.",
  "status": "failed",
  "remaining_slots": ["09:00 AM", "01:00 PM"],
  "debug_logs": [...]
}
```

**FE Action:** Show error message. Optionally display `remaining_slots` as alternative options for the same provider.

---

### 3. `POST /update_user_location` — Update User GPS

Called when the mobile app gets fresh GPS coordinates.

#### Request

```json
{
  "user_id": 1,
  "latitude": 33.6331,
  "longitude": 72.9691
}
```

#### Response

```json
{
  "message": "Location updated successfully"
}
```

### 4. `POST /sso_login` — SSO Login & Auto-Registration

Used to log in an existing user or automatically create a new user from a Google Sign-In payload.

#### Request

```json
{
  "type": "success",
  "data": {
    "scopes": [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
      "openid",
      "profile",
      "email"
    ],
    "serverAuthCode": null,
    "idToken": "eyJhbGciOiJSUzI1NiIs...",
    "user": {
      "photo": "https://lh3.googleusercontent.com/a/ACg8ocJEZt-OR85zE9KQETLGMHWjVwyZWJvMOui4Akpjftb9NJAitQ=s96-c",
      "givenName": "Jazeb",
      "familyName": "Javed",
      "email": "jazebjaved52@gmail.com",
      "name": "Jazeb Javed",
      "id": "111359634341155102078"
    }
  }
}
```

#### Response

```json
{
  "message": "User registered successfully via SSO",
  "user": {
    "id": 4,
    "name": "Jazeb Javed",
    "email": "jazebjaved52@gmail.com",
    "google_id": "111359634341155102078",
    "photo": "https://lh3.googleusercontent.com/a/ACg8ocJEZt-OR85zE9KQETLGMHWjVwyZWJvMOui4Akpjftb9NJAitQ=s96-c",
    "location": "G-13",
    "latitude": 33.6331,
    "longitude": 72.9691
  }
}
```

**FE Action**: On login/registration success, save the returned `user.id` (this is your internal `user_id` parameter to send in `/chat` and `/book` endpoints).

---

### 5. `GET /` — Health Check

```json
{
  "message": "Welcome to Karigar AI Service Orchestrator"
}
```

---

### 5. `POST /v1/process_request` — Legacy V1 (Deprecated)

Old single-flow agent pipeline. Kept for reference/tracing. Do not use in new FE code.

---

## Multi-Turn Chat Example

Here's a complete conversation flow showing how FE should accumulate messages:

### Turn 1 — User describes problem

**FE sends:**
```json
{
  "messages": [
    { "role": "user", "content": "I need a plumber" }
  ]
}
```

**Backend returns:** `selectable: false`, asks for location.

### Turn 2 — FE appends assistant reply + user's answer

**FE sends:**
```json
{
  "messages": [
    { "role": "user", "content": "I need a plumber" },
    { "role": "assistant", "content": "Sure! Could you tell me your location?" },
    { "role": "user", "content": "G-13" }
  ]
}
```

**Backend returns:** `selectable: true`, with provider list.

### Turn 3 — User selects slot (separate endpoint)

**FE sends to `/book`:**
```json
{
  "user_id": 1,
  "provider_id": 5,
  "slot": "02:00 PM",
  "language": "english"
}
```

**Backend returns:** Confirmation.

---

## Response Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `reply` | String | Conversational message to display in chat (matches user's language) |
| `language` | String | Detected language: "english", "roman_urdu", or "urdu" |
| `is_complete` | Boolean | Whether intent gathering is done |
| `selectable` | Boolean | If true, FE should render provider cards with slot buttons |
| `providers` | Array/null | List of providers (only when `selectable: true`) |
| `providers[].id` | Integer | Provider ID (needed for booking) |
| `providers[].name` | String | Provider display name |
| `providers[].location` | String | Provider's area (e.g., "G-13") |
| `providers[].rating` | Float | Rating out of 5 |
| `providers[].distance_km` | Float | Distance from user in kilometers |
| `providers[].available_slots` | Array | Bookable time slots (exact strings to send to `/book`) |
| `debug_logs` | Array | Agent execution trace (for debugging, hide in production) |

---

## Supported Services

1. AC Technician
2. Plumber
3. Electrician
4. Beautician
5. Painter
6. Carpenter
7. Appliance Repair
8. Pest Control
9. Home Cleaning
10. Locksmith

---

## Language Behavior

The system automatically detects and mirrors the user's language:

| User writes in | System replies in | Example |
|---------------|-------------------|---------|
| English | English | "Here are 2 plumbers near you" |
| Roman Urdu | Roman Urdu | "Yeh hain aap ke nazdeek 2 plumber" |
| Urdu script | Urdu script | "یہ ہیں آپ کے نزدیک 2 پلمبر" |

---

## Error Handling

| Scenario | What happens |
|----------|-------------|
| Invalid `user_id` | User treated as anonymous (no stored location) |
| Invalid `provider_id` in `/book` | Returns `{ "status": "failed", "message": "Provider not found." }` |
| Slot already taken | Returns `{ "status": "failed", "remaining_slots": [...] }` |
| Off-topic/injection | Returns `{ "is_valid": false }` with polite rejection |
| Gemini API down | Returns generic "trouble understanding" message |

---

## New Endpoints: Bookings & Notifications (V2.1)

### 1. `GET /bookings` — Paginated Bookings Listing
Retrieve a paginated list of bookings. You can optionally filter by User ID or Provider ID.

#### Query Parameters
- `user_id` (Integer, Optional): Filter bookings by recipient User ID.
- `provider_id` (Integer, Optional): Filter bookings by Provider ID.
- `page` (Integer, Optional, Default: `1`): The current page number (minimum `1`).
- `limit` (Integer, Optional, Default: `10`): Number of items per page (range `1` to `100`).

#### Response
```json
{
  "bookings": [
    {
      "id": 1,
      "user_intent": "Need AC repair in G-13",
      "user_id": 1,
      "provider_id": 1,
      "time_slot": "10:00 AM",
      "status": "confirmed",
      "provider": {
        "id": 1,
        "name": "Ali AC Services",
        "service_type": "AC Technician",
        "location": "G-13",
        "rating": 4.8
      },
      "user": {
        "id": 1,
        "name": "Ahmed Khan",
        "email": "ahmed.khan@example.com",
        "location": "G-13"
      }
    }
  ],
  "total_count": 1,
  "page": 1,
  "limit": 10,
  "total_pages": 1
}
```

---

### 2. `POST /notifications/register_token` — Register Device Push Token
Registers a device's push notification token (FCM registration token) for a user or provider to enable real-time push deliveries.

#### Request
```json
{
  "user_id": 1,
  "device_token": "fcm_registration_token_abc123xyz789..."
}
```
*Note: Specify `provider_id` instead of `user_id` if registering a token for a service provider.*

#### Response
```json
{
  "message": "Successfully registered device token for User 'Ahmed Khan'",
  "device_token": "fcm_registration_token_abc123xyz789..."
}
```

---

### 3. `POST /notifications/send` — Send Notification & Trigger Push
Sends a notification to a specific user or provider. This creates a notification log in the database and automatically triggers a push notification.
*Real-time push delivery is fully supported via both the Firebase Cloud Messaging (FCM) V1 HTTP API (using Service Account credentials) and the FCM Legacy API (using Server/API key).*

#### Request
```json
{
  "user_id": 1,
  "booking_id": 1,
  "title": "Booking Confirmed!",
  "message": "Your booking with Ali AC Services for slot 10:00 AM has been successfully confirmed.",
  "type": "booking_confirmation"
}
```

#### Response
```json
{
  "message": "Notification processed successfully",
  "notification": {
    "id": 1,
    "title": "Booking Confirmed!",
    "message": "Your booking with Ali AC Services for slot 10:00 AM has been successfully confirmed.",
    "type": "booking_confirmation",
    "is_read": false,
    "created_at": "2026-05-17T19:40:50.278110",
    "user_id": 1,
    "provider_id": null,
    "booking_id": 1
  },
  "push_trigger": {
    "status": "success",
    "service": "FCM V1 API",
    "recipient_name": "Ahmed Khan",
    "recipient_token": "fcm_registration_token_abc123xyz789...",
    "response_details": "{\"name\": \"projects/my-firebase-project/messages/0:16123456789%abcdef\"}"
  }
}
```

---

### 4. `GET /notifications` — Paginated Notifications History
Fetch all notifications received by a user or provider, complete with pagination support.

#### Query Parameters
- `user_id` (Integer, Optional): Filter notifications by recipient User ID.
- `provider_id` (Integer, Optional): Filter notifications by recipient Provider ID.
- `page` (Integer, Optional, Default: `1`): The current page number.
- `limit` (Integer, Optional, Default: `10`): Number of items per page.

#### Response
```json
{
  "notifications": [
    {
      "id": 1,
      "title": "Booking Confirmed!",
      "message": "Your booking with Ali AC Services for slot 10:00 AM has been successfully confirmed.",
      "type": "booking_confirmation",
      "is_read": false,
      "created_at": "2026-05-17T19:40:50.278110",
      "user_id": 1,
      "provider_id": null,
      "booking_id": 1
    }
  ],
  "total_count": 1,
  "page": 1,
  "limit": 10,
  "total_pages": 1
}
```

---

### 5. `POST /notifications/{id}/mark_read` — Mark Notification as Read
Marks a notification as read based on its unique ID.

#### Response
```json
{
  "message": "Notification 1 marked as read",
  "notification_id": 1,
  "is_read": true
}
```

