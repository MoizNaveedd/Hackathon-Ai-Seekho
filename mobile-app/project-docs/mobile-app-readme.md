# Karigar.ai - AI-Powered Service Marketplace

**Karigar.ai** is an intelligent mobile application that connects users with skilled local service providers (electricians, plumbers, AC technicians, carpenters, and more) using AI-driven recommendations and conversational booking. Built for the **Antigravity Hackathon** by the **AI Seekho** team.

> "Smart services. Transparent decisions."

---

## Table of Contents

- [About the Project](#about-the-project)
- [Project Value](#project-value)
- [Features](#features)
- [User Flows](#user-flows)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Integration](#api-integration)
- [AI & Smart Matching](#ai--smart-matching)
- [Authentication](#authentication)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Build & Deployment](#build--deployment)
- [Key Screens](#key-screens)
- [Technical Highlights](#technical-highlights)
- [Team](#team)

---

## About the Project

Karigar.ai solves the challenge of finding reliable, nearby service providers in Pakistan. Instead of scrolling through listings and comparing reviews manually, users simply describe their problem in natural language (text or voice), and the AI assistant handles the rest - understanding the issue, finding the best-matched providers, explaining why each was recommended, and completing the booking in a single conversation.

The app is built with **React Native (Expo 55)** and **TypeScript**, targeting both **iOS** and **Android** platforms. It communicates with a **FastAPI backend** deployed on **Google Cloud Run** that handles user management, AI-powered chat orchestration, provider matching, and booking lifecycle management.

---

## Project Value

### Problem

Finding trustworthy service providers (karigar) in Pakistan is fragmented and unreliable. Users rely on word-of-mouth, have no visibility into pricing, availability, or provider quality, and the booking process is entirely manual.

### Solution

Karigar.ai provides:

- **Conversational Booking** - Users describe their problem in plain language (Urdu or English), and the AI assistant guides them through the entire booking process.
- **Transparent AI Recommendations** - Every provider suggestion comes with a "Why him?" explanation powered by Antigravity AI Smart Match, showing exactly why a provider was chosen (proximity, price, rating, availability, experience).
- **End-to-End Lifecycle** - From discovery to booking, tracking, completion, rating, and invoice generation - all within one app.
- **Voice-First Experience** - Full voice input support for search and chat, making the app accessible to users who prefer speaking over typing.
- **Location Intelligence** - Real-time GPS-based provider filtering and distance calculation, with interactive map views.

### Impact

- Reduces time to book a service from hours (calling multiple providers) to minutes (one conversation).
- Eliminates information asymmetry between customers and providers through transparent matching.
- Provides a digital paper trail (invoices, ratings, chat history) that builds accountability.

---

## Features

### Core Features

| Feature                | Description                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| **AI Chat Assistant**  | Natural language conversation to understand service needs, recommend providers, and book appointments |
| **Smart Match Engine** | AI-powered provider ranking with confidence scores and explainable match reasons                      |
| **Voice Input**        | Speech-to-text for hands-free search and chat using native speech recognition                         |
| **Interactive Maps**   | Full-screen provider map with markers, carousel navigation, and GPS centering                         |
| **Booking Management** | View, filter (Upcoming/Active/Completed/Cancelled), cancel, and complete bookings                     |
| **Provider Profiles**  | Detailed provider pages with ratings, reviews, portfolio, specializations, and availability           |
| **Invoice Generation** | PDF invoice creation with billing breakdown, downloadable and shareable                               |
| **Push Notifications** | Real-time booking confirmations and service updates                                                   |
| **Chat History**       | Browse and revisit past conversation sessions with full message history                               |
| **Location Picker**    | Interactive map-based location selection with reverse geocoding                                       |
| **Google Sign-In**     | One-tap OAuth authentication with session persistence                                                 |

### Service Categories

The app supports 12+ service categories:

- AC Repair & Installation
- Plumbing
- Electrical Work
- Carpentry
- Painting
- Cleaning
- Appliance Repair
- Pest Control
- Gardening & Landscaping
- Home Renovation
- CCTV & Security
- Welding

---

## User Flows

### Flow 1: Chat-Based Booking

```
Login --> Describe problem (text/voice) --> AI recommends providers
--> View Smart Match reasons --> Select time slot --> Confirm booking
--> Receive notification --> View in Bookings tab
```

### Flow 2: Browse & Book

```
Home --> Browse providers on map --> Tap provider marker
--> View full profile (reviews, portfolio, ratings) --> Book Now
--> Select date & time --> Confirm --> Success notification
```

### Flow 3: Manage Bookings

```
Bookings tab --> Filter by status --> Tap booking
--> View details / Download invoice / Cancel / Complete & Rate
```

### Flow 4: Chat History

```
Chats tab --> View past sessions --> Tap session
--> Read full conversation history
```

---

## Tech Stack

### Frontend

| Technology                   | Version | Purpose                            |
| ---------------------------- | ------- | ---------------------------------- |
| React Native                 | 0.83.6  | Cross-platform mobile framework    |
| Expo                         | 55.0.24 | Development platform & build tools |
| TypeScript                   | 5.9.2   | Type-safe development              |
| React                        | 19.2.0  | UI library                         |
| Expo Router                  | 55.0.14 | File-based routing & navigation    |
| React Navigation             | 7.x     | Bottom tabs & stack navigation     |
| react-native-maps            | 1.27.2  | Google Maps integration            |
| expo-location                | 55.1.10 | GPS & reverse geocoding            |
| expo-av                      | 16.0.8  | Audio playback for voice messages  |
| expo-notifications           | 55.0.23 | Push notification support          |
| expo-print                   | 55.0.15 | PDF invoice generation             |
| expo-sharing                 | 55.0.19 | File sharing capabilities          |
| react-native-voice-to-text   | 0.1.4   | Native speech recognition          |
| @react-native-google-signin  | 16.1.2  | Google OAuth                       |
| AsyncStorage                 | 2.2.0   | Local session persistence          |
| react-native-reanimated      | 4.2.1   | Performant animations              |
| react-native-gesture-handler | 2.30.0  | Touch gesture handling             |

### Backend

| Technology         | Purpose                                               |
| ------------------ | ----------------------------------------------------- |
| FastAPI (Python)   | REST API server                                       |
| Google Cloud Run   | Serverless deployment                                 |
| AI/LLM Integration | Conversational chat orchestration & provider matching |
| Google Maps API    | Geocoding & distance calculation                      |

### Typography

- **Plus Jakarta Sans** (SemiBold, Bold) - Headlines & titles
- **Inter** (Regular, Medium, SemiBold) - Body text & UI elements

### Design System

| Token      | Value     | Usage                           |
| ---------- | --------- | ------------------------------- |
| Primary    | `#00595c` | Buttons, headers, active states |
| Secondary  | `#0d7377` | Splash screen, gradients        |
| Success    | `#005c3e` | Positive actions, confirmations |
| Warning    | `#FF8F00` | In-progress states              |
| Background | `#FAFAFA` | Screen backgrounds              |
| Text       | `#1a1a2e` | Primary text                    |
| Muted      | `#6e7979` | Secondary text, placeholders    |

---

## Project Structure

```
mobile-app/
├── src/
│   ├── app/                           # Expo Router file-based routes
│   │   ├── _layout.tsx                # Root layout (fonts, splash, auth provider)
│   │   ├── index.tsx                  # Login screen / HomeScreen entry
│   │   ├── provider-profile.tsx       # Detailed provider page with booking
│   │   ├── providers-map.tsx          # Full-screen map with provider carousel
│   │   └── terms.tsx                  # Terms of Service & Privacy Policy
│   ├── components/
│   │   ├── HomeScreen.tsx             # Multi-tab dashboard (home, bookings, chats, profile)
│   │   └── ChatBottomSheet.tsx        # AI chat interface with provider cards & booking
│   ├── context/
│   │   └── AuthContext.tsx            # Authentication state management (Google Sign-In)
│   └── services/
│       ├── apiService.ts              # Backend API client (all endpoints + types)
│       ├── transcriptionService.ts    # Voice-to-text wrapper
│       └── notificationService.ts     # Push notification helpers
├── assets/
│   └── images/                        # App icons, splash, logos, provider avatars
├── android/                           # Android native project
├── ios/                               # iOS native project
├── secrets/                           # Google OAuth credentials
├── app.json                           # Expo app configuration
├── app.config.js                      # Dynamic config (Google Maps API key)
├── package.json                       # Dependencies & scripts
├── tsconfig.json                      # TypeScript configuration
└── .env                               # Environment variables
```

---

## API Integration

**Backend Base URL:** Configured via `EXPO_PUBLIC_API_BASE_URL` environment variable, deployed on Google Cloud Run.

### Endpoints

#### Authentication

| Method | Endpoint     | Description                                                                                                                                                |
| ------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/sso_login` | Register/authenticate user via Google OAuth. Accepts Google profile data (`id`, `email`, `name`, `photo`, `idToken`), returns backend user with `user_id`. |

#### User Location

| Method | Endpoint                | Description                                                                                                                      |
| ------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/update_user_location` | Update user's GPS coordinates. Accepts `user_id`, `latitude`, `longitude`. Called automatically on every app launch after login. |

#### AI Chat (Core)

| Method | Endpoint   | Description                                                   |
| ------ | ---------- | ------------------------------------------------------------- |
| POST   | `/chat/v2` | Main AI conversation endpoint. The primary engine of the app. |

**Chat Request:**

```typescript
{
  message: string,              // User's text input
  user_id: number,              // Authenticated user ID
  session_id: number | null,    // Conversation session (null for new chat)
  selected_provider_id: number | null,
  selected_slot: string | null,
  selected_date: string | null,
  latitude: number,
  longitude: number,
  location_name: string | null
}
```

**Chat Response:**

```typescript
{
  reply: string,                // AI assistant's message
  language: string,             // Response language (en/ur)
  phase: string,                // "collecting_requirements" | "confirming_booking" | "completed"
  session_id: number,           // Persistent session ID
  state: {
    service_type: string,       // Detected service category
    location: string,
    booking_type: string | null,
    booking_date: string | null,
    phase: string
  },
  providers: Provider[] | null, // Matched providers with SmartMatch data
  booking_summary: {
    provider_id: number,
    provider_name: string,
    date: string,
    slot: string,
    hourly_rate: number
  } | null,
  booking_id: number | null,    // Confirmed booking ID
  requires_location: boolean    // Whether to request user's GPS
}
```

#### Providers

| Method | Endpoint                   | Description                                                                                                                                                                                                                                           |
| ------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/providers`               | List providers with filters: `service_type`, `location`, `min_rating`, `latitude`, `longitude`, `max_distance_km`, `booking_date`, `sort_by` (rating/distance/name), `page`, `limit`. Returns paginated results with `total_count` and `total_pages`. |
| GET    | `/providers/{provider_id}` | Get provider details including `available_slots`, `available_dates`, `smart_match` data. Accepts optional `latitude`/`longitude` for distance calculation.                                                                                            |

#### Bookings

| Method | Endpoint                          | Description                                                                                                                     |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/bookings`                       | List user's bookings (paginated). Returns provider details, service type, status, price, rating, and feedback for each booking. |
| POST   | `/bookings/{booking_id}/cancel`   | Cancel a booking. Accepts `user_id` and optional `reason`.                                                                      |
| POST   | `/bookings/{booking_id}/complete` | Mark booking as completed. Accepts `user_id`, optional `rating` (1-5), and `feedback` text.                                     |

#### Chat History

| Method | Endpoint                     | Description                                                                                                              |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/users/{user_id}/sessions`  | List past chat sessions with metadata: `service_type`, `phase`, `message_count`, `last_message`, timestamps.             |
| GET    | `/chat/{session_id}/history` | Retrieve full message history for a session. Returns messages with `role` (user/assistant), `content`, and `created_at`. |

---

## AI & Smart Matching

Karigar.ai uses **Antigravity AI Smart Match** to rank and recommend service providers. The matching engine considers multiple factors and provides transparent, explainable recommendations.

### How It Works

1. **User describes their problem** via text or voice in the chat interface.
2. **AI extracts requirements** - service type, urgency, location, preferences.
3. **Backend matches providers** using a multi-factor weighted algorithm.
4. **Results include SmartMatch data** with confidence scores and human-readable reasoning.

### SmartMatch Data Structure

```typescript
interface SmartMatch {
  headline: string; // e.g., "Best Value Near You"
  confidence: number; // 0-100 match percentage
  is_top_pick: boolean; // Highest-confidence provider flagged
  reasoning_summary: string; // One-line explanation
  match_reasons: [
    {
      factor: string; // "proximity" | "price" | "rating" | "availability" | "experience"
      title: string; // Human-readable factor name
      description: string; // Detailed explanation
    },
  ];
}
```

### Match Factors

| Factor           | Description                                        |
| ---------------- | -------------------------------------------------- |
| **Proximity**    | Distance from user's current or selected location  |
| **Price**        | Hourly rate competitiveness for the service type   |
| **Rating**       | Customer review scores and feedback history        |
| **Availability** | Open time slots matching user's preferred schedule |
| **Experience**   | Years of experience and completed job count        |

### "Why Him?" Feature

Users can tap the **"Why him?"** button on any provider card to see a detailed modal explaining exactly why that provider was recommended, with each match factor listed alongside a description. This transparency builds user trust and enables informed decision-making.

---

## Authentication

### Flow

```
Google Sign-In SDK --> Google OAuth --> ID Token + Profile
--> POST /sso_login (backend) --> Backend User (user_id)
--> Persist to AsyncStorage --> Session restored on next launch
```

### Details

- **Provider:** Google Sign-In via `@react-native-google-signin/google-signin`
- **Backend SSO:** The `/sso_login` endpoint receives Google profile data and either matches an existing user or creates a new one, returning a `user_id`
- **Persistence:** Both Google user data and backend user response stored in AsyncStorage under `@karigar:google_user` and `@karigar:backend_user`
- **Session Restore:** On app launch, `AuthContext` checks AsyncStorage and automatically restores the previous session without requiring re-login
- **Sign Out:** Clears Google Sign-In state, removes AsyncStorage entries, and returns to the login screen

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** or **yarn**
- **Expo CLI** (`npx expo`)
- **Android Studio** (for Android development) or **Xcode** (for iOS)
- **Google Maps API Key**
- **Google OAuth Client IDs** (Web + Android)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Hackathon-Ai-Seekho/mobile-app

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Running on Device/Emulator

```bash
# Android
npx expo run:android

# iOS
npx expo run:ios

# Web (preview)
npx expo start --web
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_API_BASE_URL=<backend-api-url>
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-google-oauth-web-client-id>
```

| Variable                           | Description                                         |
| ---------------------------------- | --------------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL`         | Backend API base URL (Google Cloud Run deployment)  |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`  | Google Maps API key for map rendering and geocoding |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth Web Client ID for authentication       |

---

## Build & Deployment

### Development

```bash
# Start dev server with Expo
npx expo start

# Run on Android emulator/device
npx expo run:android

# Run on iOS simulator/device
npx expo run:ios
```

### Production APK

```bash
npm run build:apk
# or
cd android && ./gradlew assembleRelease
```

### App Configuration

| Setting        | Value                                       |
| -------------- | ------------------------------------------- |
| Bundle ID      | `com.koderspace.aiseekho`                   |
| App Name       | Karigar.ai                                  |
| Orientation    | Portrait only                               |
| UI Style       | Automatic (follows device light/dark theme) |
| Typed Routes   | Enabled                                     |
| React Compiler | Enabled                                     |

---

## Key Screens

| Screen               | File                                 | Description                                                                                                                                           |
| -------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Login**            | `src/app/index.tsx`                  | Google Sign-In with animated gradient hero section and branding                                                                                       |
| **Home Dashboard**   | `src/components/HomeScreen.tsx`      | Multi-tab hub with search (text + voice), interactive map, provider carousel, bookings, chats, notifications, and profile                             |
| **AI Chat**          | `src/components/ChatBottomSheet.tsx` | Bottom sheet chat interface with voice input, provider recommendation cards, Smart Match explanations, location picker, and booking confirmation flow |
| **Provider Profile** | `src/app/provider-profile.tsx`       | Full provider details with about/reviews/portfolio tabs, Smart Match card, metrics, map location, and date/time booking modal                         |
| **Providers Map**    | `src/app/providers-map.tsx`          | Full-screen Google Maps view with provider markers and horizontal card carousel with snap-to-scroll                                                   |
| **Terms & Privacy**  | `src/app/terms.tsx`                  | Legal information and policies                                                                                                                        |

---

## Technical Highlights

- **Voice-first UX** - Pulsing microphone animation with real-time speech transcription in both search and chat interfaces
- **Smart Match explainability** - Every AI recommendation comes with transparent, human-readable reasoning rather than being a black box
- **Multi-phase conversation engine** - Chat tracks phases (`collecting_requirements` -> `confirming_booking` -> `completed`) for structured booking workflows
- **Map-chat integration** - Interactive location picker embedded within the chat flow that feeds coordinates directly into the AI conversation context
- **PDF invoice generation** - HTML-templated invoices with billing breakdown, generated via `expo-print` and shareable via `expo-sharing`
- **Animated booking confirmation** - Scale animations and success modals for a polished, delightful booking experience
- **Offline session persistence** - Users stay logged in across app restarts via AsyncStorage with automatic session restoration
- **Heads-up notifications** - Immediate high-priority push notifications on booking confirmation with custom Android channels and vibration patterns
- **Provider audio messages** - Built-in audio player with progress bar and duration display for voice message playback in chat
- **Responsive location fallbacks** - Reverse geocoding with fallback to mock area names when geocoding services are unavailable

---

## Team

**AI Seekho** - Built for the **Antigravity Hackathon**

---

## License

This project was built as part of a hackathon. Please contact the team for licensing information.
