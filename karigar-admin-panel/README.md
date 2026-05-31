# Karigar Admin Panel

Operational control center and AI analytics dashboard for **Karigar.ai** — an AI-powered service-provider and booking marketplace. The panel gives platform admins a single place to oversee providers, customers, bookings, revenue, disputes, and AI-driven insights.

> Part of the Karigar.ai suite, which also includes the customer/provider app (`servicepro-os`) and the marketing landing page.

## Features

- **Dashboard** — At-a-glance KPIs across providers, users, bookings, and disputes.
- **Provider Management** — Review, verify, suspend, and inspect service providers, their ratings, completion rates, and revenue.
- **User Management** — Browse customers, their booking history, spend, and AI chat/token usage.
- **Booking Management** — Track bookings end-to-end, including the AI recommendations that matched customers to providers.
- **AI Analytics** — Gemini-powered analytics summarizing platform activity and trends.
- **Revenue** — Service charges, platform commission, and net revenue breakdowns with charts.
- **Dispute Management** — Resolve customer/provider disputes with evidence and resolution notes.
- **Notifications** — Broadcast push notifications to users, providers, or targeted segments.
- **Settings** — Manage the signed-in admin profile.
- **Role-based admins** — Super Admin, Operations Admin, Support Agent, and Finance Admin roles.

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite 6](https://vite.dev/) build tooling
- [Tailwind CSS 4](https://tailwindcss.com/) for styling
- [Recharts](https://recharts.org/) for data visualization
- [Motion](https://motion.dev/) for animations
- [lucide-react](https://lucide.dev/) icons
- [Google Gemini](https://ai.google.dev/) (`@google/genai`) for AI analytics

> Data is currently seeded from `src/data.ts` and persisted to the browser's `localStorage`, so no backend is required to run the panel locally.

## Prerequisites

- [Node.js](https://nodejs.org/) (18+ recommended)
- A [Gemini API key](https://ai.google.dev/) for AI analytics features

## Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables.** Copy the example file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   | Variable         | Description                                    |
   | ---------------- | ---------------------------------------------- |
   | `GEMINI_API_KEY` | Required for Gemini AI analytics calls.         |
   | `APP_URL`        | URL where the app is hosted (self-references).  |

3. **Run the dev server:**

   ```bash
   npm run dev
   ```

   The app starts on [http://localhost:3000](http://localhost:3000).

### Demo Login

The login screen is pre-filled with demo credentials for local exploration:

- **Email:** `admin@karigar.ai`
- **Password:** `password123`

## Available Scripts

| Script            | Description                                   |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start the Vite dev server on port 3000.        |
| `npm run build`   | Build the production bundle to `dist/`.         |
| `npm run preview` | Preview the production build locally.           |
| `npm run lint`    | Type-check the project with `tsc --noEmit`.     |
| `npm run clean`   | Remove build artifacts (`dist`, `server.js`).   |

## Project Structure

```
karigar-admin-panel/
├── index.html              # App entry HTML
├── vite.config.ts          # Vite + Tailwind config (alias "@" -> root)
├── src/
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # App shell, auth gate, tab routing
│   ├── types.ts            # Shared TypeScript domain models
│   ├── data.ts             # Seed data + localStorage helpers
│   ├── index.css           # Global styles
│   └── components/
│       ├── auth/           # Login page
│       ├── layout/         # Sidebar / navigation
│       ├── dashboard/      # Dashboard KPIs
│       ├── providers/      # Provider management
│       ├── users/          # User management
│       ├── bookings/       # Booking management
│       ├── ai-analytics/   # Gemini-powered analytics
│       ├── revenue/        # Revenue reporting
│       ├── disputes/       # Dispute resolution
│       ├── notifications/  # Push notification manager
│       └── settings/       # Admin profile settings
└── public/                 # Static assets
```

## Notes

- The `@` import alias resolves to the project root (see `vite.config.ts`).
- All entities (providers, users, bookings, disputes, notifications) are stored in `localStorage` under `karigar_*` keys. Clear these keys to reset the panel to its seeded state.
