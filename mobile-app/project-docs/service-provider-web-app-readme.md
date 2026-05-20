# ServicePro OS — Provider Portal

A web-based dashboard for **Karigar.ai** service providers (electricians, plumbers, AC technicians, etc.) to manage their bookings, schedule, pricing, and disputes.

## Tech Stack

| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI framework |
| React Router DOM 7 | Client-side routing |
| Vite 6 | Build tool & dev server |
| Tailwind CSS 4 | Styling |
| shadcn/ui | Component library |
| Motion | Animations |
| Sonner | Toast notifications |
| React Day Picker | Calendar/date selection |
| Google Genai SDK | AI integration |

## Features

### Authentication
- **Login** — Email + password authentication
- **Registration** — Two-step signup: personal info with avatar upload → service category selection from 20+ options

### Dashboard
- Quick stats: total revenue, completed jobs, pending requests, active disputes
- Today's schedule with active and pending bookings
- Monthly profit target progress bar
- Weekly earnings growth forecast
- Recent activity feed

### Bookings
- Searchable, filterable bookings list with pagination
- Booking detail view with customer contact info, service details, pricing, and location map
- Actions: mark as completed (with feedback/rating), cancel with reason
- Statuses: Pending, Confirmed, In Progress, Completed, Cancelled, Dispute

### Calendar & Schedule
- Date picker with daily view
- Hour-by-hour timeline visualization (8 AM – 7 PM)
- Available slots count, scheduled jobs, and conflict detection
- Previous/next day navigation

### Pricing & Invoicing
- Configurable pricing: base call-out fee, travel fee per km, urgency loading, after-hours loading
- Custom additional services management
- Invoice list with status tracking (Paid/Pending), download, and send

### Disputes
- Active, in-review, and resolved dispute counts
- Dispute list with type (delay, payment, poor service, cancellation) and status
- Evidence/image attachment viewing
- Message/communication history per dispute
- Mediation policy access

## API

Connects to the Karigar.ai backend:

```
Base URL: https://karigar-backend-795466151653.us-central1.run.app
```

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/login` | POST | Provider login |
| `/api/auth/register` | POST | Provider registration (with avatar) |
| `/providers/services` | GET | Available service types |
| `/bookings?provider_id=X&page=Y&limit=Z` | GET | List bookings (paginated) |
| `/bookings/:id` | GET | Booking details |
| `/bookings/:id/complete` | POST | Complete booking with feedback |
| `/bookings/:id/cancel` | POST | Cancel booking with reason |

## Getting Started

### Prerequisites

- Node.js 18+

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
GEMINI_API_KEY="your-gemini-api-key"
APP_URL="your-app-url"
```

### Run

```bash
npm install
npm run dev
```

Dev server starts on `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
  pages/
    Dashboard.tsx       # Stats, schedule, revenue overview
    Login.tsx           # Provider login
    Registration.tsx    # Two-step provider signup
    Bookings.tsx        # Bookings list with search/filter
    BookingDetail.tsx   # Single booking view + actions
    Calendar.tsx        # Schedule & timeline view
    PricingInvoice.tsx  # Pricing config + invoice management
    Disputes.tsx        # Dispute list & resolution panel
  components/
    layout/
      DashboardLayout.tsx  # Main wrapper (sidebar + header)
      Sidebar.tsx          # Collapsible navigation
    ui/                    # shadcn/ui components (17 total)
  lib/
    api.ts              # Backend API client
    mockData.ts         # Mock data for development
    utils.ts            # Utility functions
  types/
    index.ts            # TypeScript interfaces (Booking, Customer, Dispute, etc.)
```

## Service Categories Supported

Electrician, Plumber, AC Repair, Cleaning, Car Wash, Beautician, Tutor, Carpenter, Delivery, Mechanic, Photography, Locksmith, Pest Control, Appliance Repair, Painter, Home Cleaning, and more.
