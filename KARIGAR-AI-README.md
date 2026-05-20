<h1 align="center">Karigar.ai</h1>

<p align="center">
  <b>AI Service Orchestrator for the Informal Economy</b><br/>
  Multi-agent conversational booking in English, Urdu & Roman Urdu — connecting customers with informal service workers
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Challenge_2-AI_Service_Orchestrator-FF6B35?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Antigravity_Hackathon-2026-8B5CF6?style=for-the-badge" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.83-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Expo-55-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Google%20Cloud-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

<p align="center">
  <i>"Smart services. Transparent decisions."</i>
</p>

> **Antigravity Hackathon — Challenge 2: AI Service Orchestrator for Informal Economy**
>
> Karigar.ai is our solution for Challenge 2 — an AI-powered platform that orchestrates service discovery, matching, and booking for Pakistan's informal economy workers (karigars). It uses multi-agent AI orchestration to bridge the gap between customers and the millions of skilled but digitally invisible informal workers — electricians, plumbers, AC technicians, carpenters, and more — who form the backbone of South Asia's service economy.

---

## Table of Contents

- [Challenge Alignment](#challenge-alignment)
- [Problem & Solution](#problem--solution)
- [Overall Solution Design](#overall-solution-design)
- [Architecture Overview](#architecture-overview)
- [Platform Components](#platform-components)
  - [Mobile App (Customer-Facing)](#1-mobile-app-customer-facing)
  - [Backend (AI & API Engine)](#2-backend-ai--api-engine)
  - [Service Provider Portal](#3-service-provider-portal)
  - [Landing Page](#4-landing-page)
- [AI Agents — Multi-Agent Orchestration](#ai-agents--multi-agent-orchestration)
  - [Agent 1: IntentValidationAgent](#agent-1-intentvalidationagent)
  - [Agent 2: ProviderDiscoveryAgent](#agent-2-providerdiscoveryagent)
  - [Agent 3: SmartMatchAgent](#agent-3-smartmatchagent)
  - [Agent 4: BookingConfirmationAgent](#agent-4-bookingconfirmationagent)
  - [Agent 5: FollowUpAgent](#agent-5-followupagent)
  - [Agent 6: ChatSummarizerAgent](#agent-6-chatsummarizeragent)
- [Orchestrator Flow (Phase-Based Engine)](#orchestrator-flow-phase-based-engine)
- [LLM Integration & Abstraction](#llm-integration--abstraction)
- [APIs — Real & Mock](#apis--real--mock)
- [Key Integrations](#key-integrations)
- [Database Schema](#database-schema)
- [Tech Stack Summary](#tech-stack-summary)
- [User Flows](#user-flows)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Team](#team)

---

## Challenge Alignment

**Challenge 2** asks teams to build an **AI Service Orchestrator for the Informal Economy** — a system that uses AI agents to coordinate, match, and manage service transactions for informal workers who operate outside traditional digital platforms. Here's how Karigar.ai addresses every aspect:

| Challenge Requirement | How Karigar.ai Delivers |
|---|---|
| **AI-powered orchestration** | 6 specialized AI agents coordinated by a phase-based `OrchestratorV2` engine that routes every user message to the right agent |
| **Informal economy focus** | Purpose-built for Pakistan's karigars — electricians, plumbers, AC technicians, carpenters, and other skilled workers who operate informally with no digital presence |
| **Service discovery & matching** | `ProviderDiscoveryAgent` (proximity + rating scoring) + `SmartMatchAgent` (explainable AI recommendations with grounded reasoning) |
| **Conversational interface** | Natural language chat in English, Urdu, and Roman Urdu — accessible to users with low digital literacy |
| **Voice-first accessibility** | Full speech-to-text support so users who can't type easily can still book services |
| **Transparent recommendations** | Every provider suggestion includes a "Why him?" explanation citing real data (distance, price, rating, availability) — no black-box decisions |
| **End-to-end lifecycle** | From discovery to booking, tracking, completion, rating, invoicing, and dispute resolution — all orchestrated by AI |
| **Provider empowerment** | Dedicated web portal giving informal workers digital tools for scheduling, pricing, revenue tracking, and business management |
| **Multi-agent architecture** | Each agent has a single responsibility, its own LLM config (or no LLM), and well-defined contracts — true agent orchestration, not a single monolithic prompt |

---

## Problem & Solution

### Problem

Pakistan's informal economy employs millions of skilled service workers (karigars) — electricians, plumbers, carpenters, AC technicians — who are **digitally invisible**. They have no online profiles, no standardized pricing, and no way for customers to discover them beyond word-of-mouth. Customers have no visibility into pricing, availability, or quality, and the booking process is entirely manual — often taking hours of calling multiple people to find someone available and trustworthy. This information asymmetry hurts both sides: customers can't find reliable help, and skilled workers can't reach customers beyond their immediate neighborhood.

### Solution

Karigar.ai is an **AI Service Orchestrator** that bridges this gap through multi-agent conversational intelligence. Instead of scrolling through listings, users simply describe their problem in natural language (text or voice) in English, Urdu, or Roman Urdu, and the AI assistant handles everything — understanding the issue, finding the best-matched informal workers nearby, explaining why each was recommended with transparent reasoning, and completing the booking in a single conversation. On the provider side, a dedicated web portal gives informal workers their first digital storefront — with scheduling, pricing controls, revenue analytics, and dispute management.

### Impact

- Reduces time to book a service from **hours to minutes** (one AI-orchestrated conversation)
- **Digitizes informal workers** by giving them discoverable profiles, ratings, and revenue tools — formalizing the informal
- Eliminates information asymmetry through **transparent AI matching** with explainable recommendations
- Provides a digital paper trail (invoices, ratings, chat history) that builds **accountability and trust**
- Supports **voice-first UX** for accessibility across literacy levels — critical for the informal economy demographic
- **Location intelligence** ensures workers get customers from their area, reducing travel and increasing job density

---

## Overall Solution Design

Karigar.ai is designed as a **three-sided AI-orchestrated platform** that connects informal economy workers with customers through intelligent agents:

```
 +-----------------+         +-------------------+         +--------------------+
 |   Customer      |         |   AI Backend      |         |  Service Provider  |
 |   Mobile App    | <-----> |   (Orchestrator    | <-----> |  Web Portal        |
 |                 |   REST  |    + Agents)       |   REST  |                    |
 |  - Chat (NLP)   |         |  - Intent parsing  |         |  - Manage bookings |
 |  - Voice input  |         |  - Provider match  |         |  - Set schedule    |
 |  - Map & browse |         |  - Booking engine  |         |  - Handle disputes |
 |  - Book & rate  |         |  - Notifications   |         |  - Track revenue   |
 +-----------------+         +-------------------+         +--------------------+
                                      |
                              +-------+-------+
                              |               |
                         +----+----+    +-----+-----+
                         |  Groq   |    |  Gemini   |
                         | (Llama  |    | 2.5 Flash |
                         | 3.3 70B)|    | (fallback)|
                         +---------+    +-----------+
```

**Design principles (informed by informal economy constraints):**
- **Conversational-first**: The AI chat is the primary interface, not traditional listings — because informal workers don't have polished profiles to browse
- **Voice-first accessibility**: Full speech-to-text support — critical when many users and workers in the informal economy prefer speaking over typing
- **Explainable AI**: Every recommendation includes transparent "Why him?" reasoning grounded in real data — building trust in a market where trust is the primary currency
- **Multilingual by default**: Supports English, Urdu, and Roman Urdu with automatic language detection — meeting informal economy users in their native language
- **Phase-based orchestration**: A deterministic state machine ensures the AI agents follow a structured, predictable flow while the conversation feels natural
- **Fail-safe**: On LLM failure, the system defaults to clarification — never auto-confirms a booking
- **Provider empowerment**: The portal gives informal workers digital business tools (scheduling, pricing, analytics) they've never had access to

---

## Architecture Overview

```
                          +--------------------------+
                          |       FastAPI App         |
                          |                          |
                          |  /chat          (AI)     |
                          |  /book          (direct) |
                          |  /sso-login     (auth)   |
                          |  /providers     (CRUD)   |
                          |  /bookings      (mgmt)   |
                          |  /notifications (push)   |
                          |  /api/auth      (portal) |
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
          |  &     |  |Discover|  | Match  |  |Confirm |  |Summary |
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

**Key architectural decisions:**
- **Serverless deployment** on Google Cloud Run for auto-scaling and cost efficiency
- **Dual-LLM strategy** with Groq (fast, high free-tier) as primary and Gemini as fallback
- **PostgreSQL on Neon.tech** for serverless, scalable database
- **Firebase Cloud Messaging** for real-time push notifications across platforms
- **Haversine-based proximity scoring** with no external geolocation API dependency for provider matching

---

## Platform Components

### 1. Mobile App (Customer-Facing)

The primary user interface — a cross-platform mobile app built with **React Native (Expo 55)** and **TypeScript**. Designed to make booking informal workers as easy as having a conversation.

| Feature | Description |
|---|---|
| **AI Chat Assistant** | Natural language conversation to understand needs, recommend providers, and book appointments |
| **Voice Input** | Speech-to-text for hands-free search and chat using native speech recognition |
| **Smart Match Cards** | Provider recommendations with confidence scores and explainable "Why him?" reasoning |
| **Interactive Maps** | Full-screen provider map with markers, carousel navigation, and GPS centering |
| **Booking Management** | View, filter (Upcoming/Active/Completed/Cancelled), cancel, and complete with ratings |
| **Provider Profiles** | Detailed pages with ratings, reviews, portfolio, specializations, and availability |
| **Invoice Generation** | PDF invoices with billing breakdown, downloadable and shareable |
| **Push Notifications** | Real-time booking confirmations and service updates |
| **Chat History** | Browse and revisit past conversation sessions |
| **Google Sign-In** | One-tap OAuth authentication with session persistence |

**Informal Economy Service Categories:** AC Repair, Plumbing, Electrical, Carpentry, Painting, Cleaning, Appliance Repair, Pest Control, Gardening & Landscaping, Home Renovation, CCTV & Security, Welding, and more — all trades typically operated by informal workers in Pakistan.

**Tech:** React Native 0.83 | Expo 55 | TypeScript 5.9 | Expo Router | react-native-maps | expo-location | expo-notifications | expo-print | Google Sign-In

---

### 2. Backend (AI & API Engine)

The central intelligence — a **FastAPI** application handling AI orchestration, provider matching, booking lifecycle, and all platform APIs.

**Tech:** FastAPI | SQLAlchemy 2.0 | PostgreSQL (Neon.tech) | Groq (Llama 3.3 70B) | Gemini 2.5 Flash | Firebase Cloud Messaging | Docker | Google Cloud Run

---

### 3. Service Provider Portal (Informal Worker Dashboard)

A **React web dashboard** that gives informal economy workers their first digital business management tool — transforming how karigars manage their work.

| Feature | Description |
|---|---|
| **Dashboard** | Revenue stats, today's schedule, profit targets, earnings forecasts, activity feed |
| **Booking Management** | Search, filter, view details, mark complete with feedback, cancel with reason |
| **Calendar & Schedule** | Date picker with hour-by-hour timeline (8 AM – 7 PM), conflict detection |
| **Pricing & Invoicing** | Configurable base fees, travel fees, urgency/after-hours loading, invoice tracking |
| **Dispute Resolution** | Active/in-review/resolved disputes, evidence viewing, communication history |
| **Registration** | Two-step signup with avatar upload and service category selection |

**Tech:** React 19 | TypeScript | Vite 6 | Tailwind CSS 4 | shadcn/ui | React Router DOM 7 | Motion

---

### 4. Landing Page

A marketing website showcasing Karigar.ai's mission to digitize the informal economy, with animated sections, team profiles, and download CTAs.

**Sections:** Hero with typewriter effect | How It Works | Services grid | Features | Testimonials | Team (MAJ) | CTA & Footer

**Tech:** React 19 | TypeScript | Vite 6 | Tailwind CSS 4 | Motion (Framer Motion) | Lucide React

---

## AI Agents — Multi-Agent Orchestration

The core of our Challenge 2 solution is the **multi-agent architecture**. Rather than using a single monolithic LLM prompt, the `OrchestratorV2` decomposes the service orchestration problem into 6 specialized agents — each with a single responsibility, its own LLM configuration (or no LLM at all), and well-defined input/output contracts. This is what makes Karigar.ai a true **AI Service Orchestrator**: the agents collaborate through a phase-based state machine to handle the full lifecycle of connecting a customer with an informal economy worker.

### Agent 1: IntentValidationAgent

| | |
|---|---|
| **Purpose** | Extract service type, booking date, and language from the user's conversation |
| **Uses LLM** | Yes — JSON mode, temperature 0.2 |
| **Phase** | `gathering_intent` |
| **Key behavior** | Detects language (English, Roman Urdu, Urdu) and locks it for the session. Extracts `service_type` (must map to one of the supported categories) and `booking_date`. Uses a rolling window of the last 6 messages with older messages summarized via LLM. Never asks for location (frontend handles it). Prevents false language switches on short messages (< 3 words). |

### Agent 2: ProviderDiscoveryAgent

| | |
|---|---|
| **Purpose** | Find the top 3 nearby providers with available time slots |
| **Uses LLM** | No — pure database query + haversine math |
| **Phase** | `selecting_provider` |
| **Key behavior** | Queries DB for providers matching `service_type`, filters by available slots on the `booking_date`, calculates distance via haversine formula, and scores using **proximity (60%) + rating (40%)**. Returns top 3 with name, location, rate, rating, distance, and slots. |

### Agent 3: SmartMatchAgent

| | |
|---|---|
| **Purpose** | Grounded reasoning — explain WHY each provider fits this user |
| **Uses LLM** | Yes — JSON mode, temperature 0.3, max 2048 tokens |
| **Phase** | `selecting_provider` (runs after ProviderDiscoveryAgent) |
| **Key behavior** | Builds a fact sheet per provider from real data only. Computes comparative flags (closest, cheapest, highest rated, most experienced). Sends fact sheet + user context to LLM. Returns: headline, confidence score, 2-3 match reasons per provider. **Grounding rules**: can ONLY cite facts from the fact sheet, NEVER invents certifications/brands/skills, must use valid factors (`proximity`, `price`, `rating`, `availability`, `experience`, `speed`). Falls back to deterministic rule-based cards if LLM fails. |

### Agent 4: BookingConfirmationAgent

| | |
|---|---|
| **Purpose** | Handle confirm, change, cancel, and reject actions during booking confirmation |
| **Uses LLM** | Yes — JSON mode, temperature 0.1 |
| **Phase** | `confirming_booking` |
| **Key behavior** | Classifies user messages into: `confirm` (create booking + FCM notification), `change_time`, `change_provider`, `reject`, `change_intent`, `cancel`, or `clarify`. On LLM failure, the default action is `clarify` — **never auto-confirms**. Creates the booking record, removes the slot from the provider's availability, and triggers the summarizer. |

### Agent 5: FollowUpAgent

| | |
|---|---|
| **Purpose** | Schedule post-booking reminders (1 hour before appointment) |
| **Uses LLM** | No |
| **Phase** | Post-booking |

### Agent 6: ChatSummarizerAgent

| | |
|---|---|
| **Purpose** | Summarize the full chat into a plain paragraph and save to `booking.prompt` |
| **Uses LLM** | Yes — non-JSON mode, temperature 0.3 |
| **Phase** | Post-booking (background thread) |
| **Key behavior** | Runs in a separate thread via `threading.Thread` after booking confirmation. Reads the full conversation and generates a plain-text summary stored on the booking record for the provider portal. |

---

## Orchestrator Flow (Phase-Based Engine)

The `OrchestratorV2` manages a deterministic phase-based conversation where each user message is routed to the appropriate agent(s).

> Every message hits `/chat` -> `OrchestratorV2.process_chat()` -> `_route()` -> phase-specific handler

### Phase 1: `gathering_intent`

The user describes their problem. The **IntentValidationAgent** extracts service type and booking date through natural conversation.

```
User:  "mera AC kharab ho gaya hai"
Bot:   "Oh no! AC ki problem hai? Aaj ke liye chahiye ya kisi aur din?"
       -> service_type = "AC Technician" | is_complete = false

User:  "aaj chahiye"
Bot:   (checks location -> has it -> moves to Phase 2)
       -> booking_date = "2026-05-20" | is_complete = true
```

Once intent is complete, the orchestrator checks for user coordinates. If missing, the frontend shows a map picker (`requires_location: true`).

### Phase 2: `selecting_provider`

**ProviderDiscoveryAgent** finds providers, then **SmartMatchAgent** enriches each with explainable reasoning.

If the user types instead of selecting from the UI, an LLM analyzer classifies the message:
- `show_more` — re-discover, excluding shown providers
- `change_date` — update date, re-discover
- `change_intent` — reset to Phase 1
- `other` — reply conversationally, guide to select

### Phase 3: `confirming_booking`

The user selected a provider + slot + date. The **BookingConfirmationAgent** shows a summary and handles confirmation, changes, or cancellation.

### Phase 4: `completed`

Booking confirmed. Session marked done. If the user sends another message, a new session auto-creates and routes to Phase 1. The **ChatSummarizerAgent** runs in the background to generate a chat summary.

---

## LLM Integration & Abstraction

```python
_call_llm(system_instruction, prompt, json_mode=True, max_tokens=1024, temperature=0.2)
```

Dual-provider architecture with automatic failover:

| Priority | Provider | Model | Role |
|---|---|---|---|
| **Primary** | Groq | Llama 3.3 70B Versatile | Faster inference, higher free-tier quota |
| **Fallback** | Gemini | Gemini 2.5 Flash | Used when Groq fails or hits rate limits |

Both providers support JSON mode for structured agent outputs. If both fail, an exception is raised — the system never silently degrades.

---

## APIs — Real & Mock

### Real APIs (Production)

All backend endpoints are **real, fully functional APIs** deployed on Google Cloud Run.

#### Core Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat` | Main AI conversation endpoint — routes through the orchestrator |
| `POST` | `/book` | Direct booking shortcut (bypass chat flow) |

#### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/sso-login` | Google Sign-In for customers |
| `POST` | `/api/auth/register` | Provider registration with avatar upload |
| `POST` | `/api/auth/login` | Provider login (email + password) |
| `GET` | `/api/auth/profile/{id}` | Provider profile |

#### Users & Location

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/update_user_location` | Update user GPS coordinates |

#### Providers

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/providers` | List/filter/sort providers (distance, rating, location) with pagination |
| `GET` | `/providers/services` | List available service types |
| `GET` | `/providers/{id}` | Provider detail with distance calculation |
| `POST` | `/providers` | Create a provider |
| `PUT` | `/providers/{id}/slots` | Update available time slots |

#### Bookings & Notifications

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/bookings` | List bookings (filter by user/provider/status, paginated) |
| `GET` | `/bookings/{id}` | Booking detail |
| `POST` | `/bookings/{id}/complete` | Mark complete with feedback & rating |
| `POST` | `/bookings/{id}/cancel` | Cancel with reason |
| `GET` | `/notifications` | List notifications for user/provider |
| `POST` | `/notifications/{id}/read` | Mark notification as read |
| `POST` | `/notifications/read-all` | Mark all as read |

#### Chat History

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/user/{user_id}/sessions` | List user's chat sessions |
| `GET` | `/session/{session_id}/messages` | Get messages for a session |

### Mock / Seeded Data

- **Provider profiles** are seeded via `seed.py` with realistic data (names, locations in Karachi, GPS coordinates, ratings, hourly rates, available slots)
- **Provider Portal** uses `mockData.ts` for development with mock dashboard stats, calendar data, pricing configs, and dispute records
- **Landing Page** uses static testimonials and team data

### External APIs Used

| API | Purpose | Type |
|---|---|---|
| **Groq API** | Primary LLM inference (Llama 3.3 70B) | Real |
| **Google Gemini API** | Fallback LLM inference (Gemini 2.5 Flash) | Real |
| **Google Maps API** | Map rendering, geocoding, distance calculation | Real |
| **Google OAuth API** | Customer authentication (Sign-In) | Real |
| **Firebase Cloud Messaging** | Push notifications to mobile devices | Real |
| **Neon.tech PostgreSQL** | Serverless database hosting | Real |

---

## Key Integrations

| Integration | How It's Used |
|---|---|
| **Google Sign-In** | One-tap OAuth on mobile -> `/sso-login` backend -> user creation/matching -> session stored in AsyncStorage |
| **Google Maps** | Interactive maps in mobile app (provider markers, carousel, GPS centering) + location picker in chat flow |
| **Firebase Cloud Messaging** | Booking confirmation push notifications with custom Android channels and vibration patterns |
| **Groq + Gemini (Dual LLM)** | All agent LLM calls route through `_call_llm()` with automatic failover from Groq to Gemini |
| **Neon.tech PostgreSQL** | All persistent data (users, providers, bookings, chat sessions, messages, notifications) |
| **expo-print + expo-sharing** | HTML-templated PDF invoice generation with billing breakdown, downloadable and shareable |
| **expo-notifications** | High-priority heads-up notifications on booking confirmation |
| **react-native-voice-to-text** | Native speech recognition for voice-first search and chat input |

---

## Database Schema

### Users

| Column | Type | Description |
|---|---|---|
| `id` | Integer (PK) | Auto-increment |
| `name` | String | Display name |
| `email` | String (unique) | Email address |
| `google_id` | String (unique) | Google SSO ID |
| `location` | String | Location name |
| `latitude` / `longitude` | Float | GPS coordinates |
| `device_token` | String | FCM push notification token |

### Providers

| Column | Type | Description |
|---|---|---|
| `id` | Integer (PK) | Auto-increment |
| `name` | String | Provider business name |
| `service_type` | String | One of the supported services |
| `location` | String | Area name |
| `latitude` / `longitude` | Float | GPS coordinates |
| `rating` | Float | Average rating (1-5) |
| `hourly_rate` | Float | PKR per hour |
| `available_slots` | Text (JSON) | `{"2026-05-20": ["09:00 AM", "01:00 PM"]}` |
| `avatar` | String | Profile picture path |

### Bookings

| Column | Type | Description |
|---|---|---|
| `id` | Integer (PK) | Auto-increment |
| `user_id` | FK -> Users | Customer who booked |
| `provider_id` | FK -> Providers | Assigned provider |
| `time_slot` | String | e.g. "09:00 AM" |
| `booking_date` | String | "YYYY-MM-DD" |
| `status` | String | Confirmed / Completed / Cancelled / Dispute |
| `price` | Float | Hourly rate at time of booking |
| `prompt` | Text | AI-generated chat summary |
| `customer_rating` | Float | User's 1-5 rating |
| `customer_feedback` | Text | User's review text |

### ChatSession & ChatMessage

Each session stores an `extracted_state` JSON that tracks the full conversation state (phase, intent, providers, location, etc.), making every step **fully traceable**. Each message stores a `state_snapshot` and `extra_data` for debugging and audit.

### Notifications

Stores push notification records with title, message, type, read status, and references to users and bookings.

---

## Tech Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| **Mobile App** | React Native 0.83 + Expo 55 + TypeScript | Cross-platform customer app (iOS & Android) |
| **Backend** | FastAPI + SQLAlchemy 2.0 + Python 3.11 | REST API + AI orchestration engine |
| **Database** | PostgreSQL (Neon.tech) | Serverless relational database |
| **Primary LLM** | Groq (Llama 3.3 70B) | Fast inference for all agent LLM calls |
| **Fallback LLM** | Gemini 2.5 Flash | Automatic failover when Groq is unavailable |
| **Provider Portal** | React 19 + Vite 6 + shadcn/ui + Tailwind | Service provider web dashboard |
| **Landing Page** | React 19 + Vite 6 + Tailwind + Motion | Marketing website |
| **Auth** | Google Sign-In (mobile) + Email/Password (portal) | Customer & provider authentication |
| **Maps** | Google Maps API + react-native-maps | Location services & interactive maps |
| **Notifications** | Firebase Cloud Messaging + expo-notifications | Real-time push notifications |
| **Deployment** | Docker + Google Cloud Run | Containerized serverless deployment |
| **Voice** | react-native-voice-to-text | Native speech recognition |

---

## User Flows

### Flow 1: Chat-Based Booking (Primary)

```
Login -> Describe problem (text/voice) -> AI extracts intent
-> Location check -> AI recommends top 3 providers with Smart Match
-> View "Why him?" explanations -> Select provider + time slot
-> Confirm booking -> Push notification -> View in Bookings tab
```

### Flow 2: Browse & Book

```
Home -> Browse providers on map -> Tap provider marker
-> View full profile (reviews, portfolio, ratings) -> Book Now
-> Select date & time -> Confirm -> Success notification
```

### Flow 3: Manage Bookings

```
Bookings tab -> Filter by status -> Tap booking
-> View details / Download invoice / Cancel / Complete & Rate
```

### Flow 4: Karigar (Informal Worker) Portal

```
Worker login -> Dashboard (stats, schedule, revenue)
-> Manage bookings -> Update calendar & pricing
-> Handle disputes -> Track invoices
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **Python** 3.11+ (for backend)
- **Expo CLI** (`npx expo`)
- **Docker** (optional, for containerized backend)
- **Android Studio** or **Xcode** (for mobile development)

### Mobile App

```bash
cd mobile-app
npm install
npx expo start
```

Create a `.env` file:
```env
EXPO_PUBLIC_API_BASE_URL=<backend-api-url>
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-google-oauth-web-client-id>
```

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 seed.py          # Seed provider data (first time)
python3 -m uvicorn main:app --reload --port 8080
```

Create a `.env` file:
```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
```

### Provider Portal

```bash
cd service-provider-portal
npm install
npm run dev
```

### Landing Page

```bash
cd landing-page
npm install
npm run dev
```

---

## Project Structure

```
Hackathon-Ai-Seekho/
├── mobile-app/                    # React Native (Expo 55) customer app
│   ├── src/
│   │   ├── app/                   # Expo Router file-based routes
│   │   │   ├── _layout.tsx        # Root layout (fonts, splash, auth)
│   │   │   ├── index.tsx          # Login / Home entry
│   │   │   ├── provider-profile.tsx
│   │   │   ├── providers-map.tsx
│   │   │   └── terms.tsx
│   │   ├── components/
│   │   │   ├── HomeScreen.tsx     # Multi-tab dashboard
│   │   │   └── ChatBottomSheet.tsx # AI chat interface
│   │   ├── context/
│   │   │   └── AuthContext.tsx    # Google Sign-In state
│   │   └── services/
│   │       ├── apiService.ts      # Backend API client
│   │       ├── transcriptionService.ts
│   │       └── notificationService.ts
│   ├── assets/images/
│   ├── android/ & ios/
│   └── project-docs/              # Component-level documentation
│
├── backend/                       # FastAPI + AI agents
│   ├── main.py                    # Core chat & auth endpoints
│   ├── agents_v2.py               # All 6 AI agents
│   ├── orchestrator_v2.py         # Phase-based routing engine
│   ├── providers.py               # Provider CRUD endpoints
│   ├── bookings_notifications.py  # Booking & notification endpoints
│   ├── auth_bookings_api.py       # Provider auth endpoints
│   ├── models.py                  # SQLAlchemy database models
│   ├── seed.py                    # Mock data seeder
│   ├── Dockerfile
│   └── requirements.txt
│
├── service-provider-portal/       # React web dashboard
│   └── src/
│       ├── pages/                 # Dashboard, Bookings, Calendar, etc.
│       ├── components/            # Layout + shadcn/ui components
│       ├── lib/                   # API client, mock data, utils
│       └── types/                 # TypeScript interfaces
│
├── landing-page/                  # React marketing website
│   └── src/
│       ├── App.tsx                # Single-page app
│       └── main.tsx
│
└── README.md                      # This file
```

---

## Team

**Team AI Seekho** — Built for **Antigravity Hackathon | Challenge 2: AI Service Orchestrator for Informal Economy**

| Name | Role |
|---|---|
| **Moiz Naveed** | Founder & CEO |
| **Aun Muhammad** | Co-Founder & CTO |
| **Jazeb Javed** | Lead Developer |

---

<p align="center">
  <b>Karigar.ai</b> — Orchestrating the informal economy, one conversation at a time.
</p>
