<h1 align="center">Karigar AI — Backend</h1>

<p align="center">
  <b>AI-powered home service booking platform</b><br/>
  Multi-agent orchestration | Conversational booking in English, Urdu & Roman Urdu
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Google%20Cloud-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white" />
</p>

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Agent Flow — How the Orchestrator Works](#agent-flow--how-the-orchestrator-works)
  - [Phase 1: Gathering Intent](#phase-1-gathering_intent)
  - [Phase 2: Selecting Provider](#phase-2-selecting_provider)
  - [Phase 3: Confirming Booking](#phase-3-confirming_booking)
  - [Phase 4: Completed](#phase-4-completed)
- [Complete Agent Reference](#complete-agent-reference)
- [LLM Abstraction](#llm-abstraction)
- [Database Models](#database-models)
- [API Endpoints](#api-endpoints)
- [State Management](#state-management)
- [Location Handling](#location-handling)
- [Getting Started](#getting-started)
- [File Structure](#file-structure)

---

## Tech Stack

| Technology                  | Purpose                   |
| --------------------------- | ------------------------- |
| **FastAPI**                 | REST API framework        |
| **SQLAlchemy 2.0**          | ORM                       |
| **PostgreSQL** (Neon.tech)  | Serverless database       |
| **Groq** (Llama 3.3 70B)   | Primary LLM provider      |
| **Gemini 2.5 Flash**        | Fallback LLM provider     |
| **Firebase Cloud Messaging** | Push notifications       |
| **Docker**                  | Containerization          |
| **Google Cloud Run**        | Deployment                |

---

## Architecture Overview

```
                          +--------------------------+
                          |       FastAPI App         |
                          |                          |
                          |  main.py                 |
                          |    /chat                 |
                          |    /book                 |
                          |    /sso-login            |
                          |    /update_user_location |
                          |                          |
                          |  providers.py            |
                          |    /providers (CRUD)     |
                          |                          |
                          |  bookings_notifications  |
                          |    /bookings             |
                          |    /notifications        |
                          |                          |
                          |  auth_bookings_api.py    |
                          |    /api/auth             |
                          +------------+-------------+
                                       |
                                       v
                          +------------+-------------+
                          |     OrchestratorV2       |
                          |  (Phase-based engine)    |
                          |                          |
                          |  gathering_intent        |
                          |       |                  |
                          |       v                  |
                          |  selecting_provider      |
                          |       |                  |
                          |       v                  |
                          |  confirming_booking      |
                          |       |                  |
                          |       v                  |
                          |  completed               |
                          +------------+-------------+
                                       |
               +-----------+-----------+-----------+-----------+
               |           |           |           |           |
               v           v           v           v           v
          +--------+  +--------+  +--------+  +--------+  +--------+
          | Intent |  |Provider|  | Smart  |  |Booking |  |  Chat  |
          |  &     |  |Discovery| | Match  |  |Confirm |  |Summary |
          |Validate|  | Agent  |  | Agent  |  | Agent  |  | Agent  |
          +--------+  +--------+  +--------+  +--------+  +--------+
               |           |           |           |           |
               +-----+-----+-----+-----+-----+-----+          |
                     |                                         |
                     v                                         v
          +---------------------+                +-------------------+
          |  LLM Abstraction    |                |  Background       |
          |  Groq (primary)     |                |  Thread           |
          |  Gemini (fallback)  |                |  (post-booking)   |
          +---------------------+                +-------------------+
```

---

## Agent Flow — How the Orchestrator Works

The **`OrchestratorV2`** is the brain of the system. It manages a phase-based conversation where each user message is routed through specialized agents depending on the current phase.

> Every message hits `/chat` → `OrchestratorV2.process_chat()` → `_route()` → phase-specific handler

---

### Phase 1: `gathering_intent`

> **Agent:** `IntentValidationAgent`

The user starts a conversation. The intent agent does the following:

| Step | What Happens |
| ---- | ------------ |
| 1    | Detects the user's **language** (English, Roman Urdu, Urdu) and locks it for the session |
| 2    | Extracts **service_type** — must map to one of 10 categories (see below) |
| 3    | Extracts **booking_date** — `"aaj"/"today"` = today, `"kal"` = tomorrow, or specific date |
| 4    | Validates the request is about a home service (rejects off-topic messages) |
| 5    | Responds conversationally — empathetic, warm, like a helpful neighbor |

**Supported services:**
`AC Technician` | `Plumber` | `Electrician` | `Beautician` | `Painter` | `Carpenter` | `Appliance Repair` | `Pest Control` | `Home Cleaning` | `Locksmith`

**Rolling Window:** Uses the last 6 messages directly. Older messages are summarized into a context string via LLM to prevent token overflow.

**Completion criteria:** State is marked `is_complete: true` only when **both** `service_type` AND `booking_date` are confirmed by the user.

**Location check:** Once intent is complete, the orchestrator checks for coordinates:

| Condition | Action |
| --------- | ------ |
| lat/lng in session state | Proceed to Phase 2 |
| lat/lng in user profile (from previous session) | Use those, proceed to Phase 2 |
| No location at all | Return `requires_location: true` → frontend shows map picker |

**Example conversation:**

```
User:  "mera AC kharab ho gaya hai"
Bot:   "Oh no! AC ki problem hai? Aaj ke liye chahiye ya kisi aur din?"
       → service_type = "AC Technician" | is_complete = false

User:  "aaj chahiye"
Bot:   (orchestrator checks location → has it → moves to Phase 2)
       → booking_date = "2026-05-20" | is_complete = true
```

---

### Phase 2: `selecting_provider`

> **Agents:** `ProviderDiscoveryAgent` + `SmartMatchAgent`

#### Step A — Discovery

The **ProviderDiscoveryAgent** finds the best providers:

| Step | What Happens |
| ---- | ------------ |
| 1    | Queries DB for providers matching `service_type` |
| 2    | Filters by available slots on the `booking_date` |
| 3    | Calculates distance from user via **haversine formula** |
| 4    | Scores: **proximity (60%) + rating (40%)** |
| 5    | Returns **top 3** with name, location, rate, rating, distance, slots |

> No LLM call — pure DB query + math.

#### Step B — Smart Match (Grounded Reasoning)

The **SmartMatchAgent** enriches each provider with a human-readable explanation of **WHY** they're a good fit:

| Step | What Happens |
| ---- | ------------ |
| 1    | Builds a **fact sheet** per provider from real data only |
| 2    | Computes **comparative flags** (closest, cheapest, highest rated, most experienced) |
| 3    | Sends fact sheet + user context to LLM |
| 4    | LLM returns: headline, confidence score, 2-3 match reasons per provider |
| 5    | Falls back to **deterministic rule-based cards** if LLM fails |

**Fact sheet fields** (per provider):
```
name, location, distance_km, hourly_rate, rating,
open_slots_on_date, completed_bookings (from DB)
```

**Grounding rules** — the LLM:
- Can ONLY cite facts from the fact sheet
- NEVER invents certifications, brands, or skills
- Must use valid factors: `proximity` | `price` | `rating` | `availability` | `experience` | `speed`

**Output attached to each provider:**

```json
{
  "headline": "Best for urgent repair",
  "confidence": 0.92,
  "is_top_pick": true,
  "reasoning_summary": "Closest to you with the highest rating",
  "match_reasons": [
    {
      "factor": "proximity",
      "title": "Closest to You",
      "description": "Just 1.2 km away."
    },
    {
      "factor": "rating",
      "title": "Top Rated",
      "description": "Rated 4.8/5 by customers."
    }
  ]
}
```

#### If the user types instead of selecting

An LLM analyzer classifies the message:

| Action | Trigger | Result |
| ------ | ------- | ------ |
| `show_more` | "doosra dikhao", "koi aur" | Re-discover, excluding shown providers |
| `change_date` | "kal ke liye dikhao" | Update date, re-discover |
| `change_intent` | "mujhe plumber chahiye" | Reset to Phase 1 |
| `other` | Greeting, question | Reply conversationally, guide to select |

---

### Phase 3: `confirming_booking`

> **Agent:** `BookingConfirmationAgent`

The user selected a provider + slot + date from the frontend. The orchestrator shows a summary and asks for confirmation.

If the user types a message, the LLM classifies it:

| Action | Trigger | Result |
| ------ | ------- | ------ |
| `confirm` | "haan", "book karo", "yes" | Create booking, remove slot, send FCM notification, trigger summarizer |
| `change_time` | "3 baje ka time dedo" | Validate against available slots, update |
| `change_provider` | "doosra dikhao" | Back to Phase 2, exclude current providers |
| `reject` | "ye nahi", "nahi" | Back to Phase 2 with provider list intact |
| `change_intent` | "actually plumber chahiye" | Reset to Phase 1 |
| `cancel` | "rehne do", "cancel" | Mark session completed, done |
| `clarify` | Ambiguous message / LLM failure | Ask user what they want (**never auto-confirms**) |

> **Safety:** On LLM failure, the default action is `clarify` — never `confirm`. The system will never accidentally create a booking.

---

### Phase 4: `completed`

The booking is confirmed and the session is marked done.

- If the user sends another message → **new session** is auto-created, routed to Phase 1
- **Background:** `ChatSummarizerAgent` runs in a separate thread, reads the full conversation, generates a plain-text summary, and saves it to `booking.prompt` for the provider portal

---

## Complete Agent Reference

### Agent 1 — IntentValidationAgent

| | |
|---|---|
| **File** | `agents_v2.py` line 169 |
| **Purpose** | Extract service type, booking date, language from conversation |
| **LLM** | JSON mode, temperature 0.2 |
| **Key behavior** | Never asks for location (frontend handles it). Merges new state with cached state to avoid losing extracted fields. Prevents false language switches on short messages (< 3 words). |

### Agent 2 — ProviderDiscoveryAgent

| | |
|---|---|
| **File** | `agents_v2.py` line 301 |
| **Purpose** | Find top 3 nearby providers with available slots |
| **LLM** | None — pure DB query + haversine math |
| **Scoring** | `rating/5 * 0.4 + (1 - distance/max_distance) * 0.6` |

### Agent 2b — SmartMatchAgent

| | |
|---|---|
| **File** | `agents_v2.py` line 399 |
| **Purpose** | Grounded reasoning — explain WHY each provider fits this user |
| **LLM** | JSON mode, temperature 0.3, max 2048 tokens |
| **Grounding** | Only cites facts from the fact sheet. Never invents data. Falls back to deterministic cards on failure. |

### Agent 3 — BookingConfirmationAgent

| | |
|---|---|
| **File** | `agents_v2.py` line 602 |
| **Purpose** | Handle confirm / change / cancel during booking confirmation |
| **LLM** | JSON mode, temperature 0.1 |
| **DB write** | Creates booking record, removes slot from provider's `available_slots` JSON |

### Agent 4 — FollowUpAgent

| | |
|---|---|
| **File** | `agents_v2.py` line 723 |
| **Purpose** | Schedule post-booking reminders (1 hour before appointment) |
| **LLM** | None |

### Agent 5 — ChatSummarizerAgent

| | |
|---|---|
| **File** | `agents_v2.py` line 741 |
| **Purpose** | Summarize the full chat into a plain paragraph, save to `booking.prompt` |
| **LLM** | Non-JSON mode, temperature 0.3 |
| **Execution** | Background thread via `threading.Thread` — runs after booking confirmation |

---

## LLM Abstraction

```python
_call_llm(system_instruction, prompt, json_mode=True, max_tokens=1024, temperature=0.2)
```

Dual-provider with automatic failover:

| Priority | Provider | Model | Notes |
| -------- | -------- | ----- | ----- |
| Primary | **Groq** | Llama 3.3 70B Versatile | Faster, higher free tier quota |
| Fallback | **Gemini** | Gemini 2.5 Flash | Used when Groq fails or hits rate limits |

Both support JSON mode. If both fail, an exception is raised.

---

## Database Models

### Users

| Column | Type | Description |
| ------ | ---- | ----------- |
| `id` | Integer (PK) | Auto-increment |
| `name` | String | User's display name |
| `email` | String (unique) | Email address |
| `google_id` | String (unique) | Google SSO ID |
| `location` | String | Location name (e.g. "PECHS") |
| `latitude` / `longitude` | Float | GPS coordinates |
| `device_token` | String | FCM push notification token |

### Providers

| Column | Type | Description |
| ------ | ---- | ----------- |
| `id` | Integer (PK) | Auto-increment |
| `name` | String | Provider business name |
| `service_type` | String | One of the 10 supported services |
| `location` | String | Area name (e.g. "Clifton") |
| `latitude` / `longitude` | Float | GPS coordinates |
| `rating` | Float | Average rating (1-5) |
| `hourly_rate` | Float | PKR per hour |
| `available_slots` | Text (JSON) | `{"2026-05-20": ["09:00 AM", "01:00 PM"]}` |
| `avatar` | String | Profile picture path |

### Bookings

| Column | Type | Description |
| ------ | ---- | ----------- |
| `id` | Integer (PK) | Auto-increment |
| `user_id` | FK → Users | Customer who booked |
| `provider_id` | FK → Providers | Assigned provider |
| `time_slot` | String | e.g. "09:00 AM" |
| `booking_date` | String | "YYYY-MM-DD" |
| `status` | String | Confirmed, Completed, Cancelled, Dispute |
| `price` | Float | Hourly rate at time of booking |
| `prompt` | Text | AI-generated chat summary |
| `customer_rating` | Float | User's 1-5 rating |
| `customer_feedback` | Text | User's review text |

### ChatSession

| Column | Type | Description |
| ------ | ---- | ----------- |
| `id` | Integer (PK) | Auto-increment |
| `user_id` | FK → Users | Session owner |
| `status` | String | `active` or `completed` |
| `extracted_state` | Text (JSON) | Full session state (phase, intent, providers, etc.) |
| `context_summary` | Text | LLM summary of older messages |

### ChatMessage

| Column | Type | Description |
| ------ | ---- | ----------- |
| `id` | Integer (PK) | Auto-increment |
| `session_id` | FK → ChatSession | Parent session |
| `role` | String | `user` or `assistant` |
| `content` | Text | Message text |
| `state_snapshot` | Text (JSON) | State at time of this message |
| `extra_data` | Text (JSON) | Metadata (requires_location, action, booking_summary, etc.) |

### Notifications

| Column | Type | Description |
| ------ | ---- | ----------- |
| `id` | Integer (PK) | Auto-increment |
| `title` / `message` | String | Notification content |
| `type` | String | e.g. `booking_confirmation` |
| `is_read` | Boolean | Read status |
| `user_id` | FK → Users | Recipient |
| `booking_id` | FK → Bookings | Related booking |

---

## API Endpoints

### Core Chat — `main.py`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `POST` | `/chat` | Main conversational endpoint — routes through the orchestrator |
| `POST` | `/book` | Direct booking shortcut (bypass chat flow) |
| `POST` | `/update_user_location` | Update user lat/lng |
| `POST` | `/sso-login` | Google Sign-In authentication |
| `GET` | `/user/{user_id}/sessions` | List user's chat sessions |
| `GET` | `/session/{session_id}/messages` | Get messages for a session |

### Providers — `providers.py`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/providers` | List/filter/sort providers (distance, rating, location) |
| `GET` | `/providers/services` | List available service types |
| `GET` | `/providers/{id}` | Provider detail with distance calculation |
| `POST` | `/providers` | Create a provider |
| `PUT` | `/providers/{id}/slots` | Update available slots |

### Bookings & Notifications — `bookings_notifications.py`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/bookings` | List bookings (filter by user/provider/status, paginated) |
| `GET` | `/bookings/{id}` | Booking detail |
| `POST` | `/bookings/{id}/complete` | Mark complete with feedback |
| `POST` | `/bookings/{id}/cancel` | Cancel with reason |
| `GET` | `/notifications` | List notifications for user/provider |
| `POST` | `/notifications/{id}/read` | Mark notification as read |
| `POST` | `/notifications/read-all` | Mark all as read |

### Provider Auth — `auth_bookings_api.py`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `POST` | `/api/auth/register` | Provider registration with avatar upload |
| `POST` | `/api/auth/login` | Provider login (email + password) |
| `GET` | `/api/auth/profile/{id}` | Get provider profile |

---

## State Management

Each `ChatSession` stores an `extracted_state` JSON that persists across messages:

```json
{
  "phase": "gathering_intent",
  "service_type": "AC Technician",
  "booking_type": "urgent",
  "booking_date": "2026-05-20",
  "language": "roman_urdu",
  "latitude": 24.8720,
  "longitude": 67.0640,
  "location_name": "PECHS",
  "providers": [ ... ],
  "booking_summary": { ... },
  "shown_provider_ids": [1, 2, 3]
}
```

Each `ChatMessage` also stores:

| Field | Purpose |
| ----- | ------- |
| `state_snapshot` | Full state JSON at the time this message was created |
| `extra_data` | Action metadata — `requires_location`, `booking_summary`, `action`, errors |

This makes every step of the conversation **fully traceable**.

---

## Location Handling

```
Frontend (map picker)
    |
    |  latitude, longitude, location_name
    v
POST /chat
    |
    v
OrchestratorV2._route()
    |
    +--> state["latitude"] = lat
    +--> state["longitude"] = lng
    +--> state["location_name"] = name
    +--> user.latitude = lat  (persisted for future sessions)
    |
    v
ProviderDiscoveryAgent
    |
    +--> haversine(user_lat, user_lng, provider_lat, provider_lng)
    +--> distance_km per provider
    +--> scoring: proximity 60% + rating 40%
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL (or a [Neon.tech](https://neon.tech) account)

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
```

### Run Locally

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 seed.py                              # Seed mock data (first time)
python3 -m uvicorn main:app --reload --port 8080
```

### Run with Docker

```bash
docker build -t karigar-backend .
docker run -p 8080:8080 --env-file .env karigar-backend
```

### Deploy to Google Cloud Run

```bash
gcloud run deploy karigar-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```