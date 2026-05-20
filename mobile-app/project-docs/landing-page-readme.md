# Karigar.ai — Landing Page

The official marketing and product landing page for **Karigar.ai**, an AI-powered home service booking platform built for South Asia.

## Tech Stack

| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI framework |
| Vite 6 | Build tool & dev server |
| Tailwind CSS 4 | Styling |
| Motion (Framer Motion) | Animations |
| Lucide React | Icons |
| Google Genai SDK | AI integration |

## Page Sections

- **Hero** — Typewriter effect showcasing multilingual queries (Roman Urdu, English), app store download CTAs, and an iPhone mockup with the booking UI
- **How It Works** — Three-step flow: Speak your mind → AI Smart Match → Instant Confirmation
- **Services** — Grid of 12+ service categories (Electrician, Plumber, AC Repair, Cleaning, Beautician, Carpenter, etc.)
- **Features** — Context-aware AI, multi-language support (Urdu, English, Roman Urdu, Pashto), real-time matching under 30s, smart location routing, verified professionals, instant confirmation
- **Testimonials** — Customer reviews with star ratings
- **Team (MAJ)** — Moiz Naveed (Founder & CEO), Aun Muhammad (Co-Founder & CTO), Jazeb Javed (Lead Developer)
- **CTA & Footer** — Download links, press mentions, contact info, social links

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
npm run preview
```

## Project Structure

```
src/
  App.tsx         # Single-page app — all sections in one component
  main.tsx        # React DOM entry point
  index.css       # Tailwind config + custom styles
public/
  logo.png
  teampictures/   # Team member photos
```

## Design System

- **Colors:** Primary `#0D7377` (teal), Secondary `#00ADB5` (cyan), Accent `#EEEEEE`
- **Fonts:** Inter (body), Outfit (display), JetBrains Mono (code)
- **Effects:** Glass morphism, gradient text, grain overlay, scroll-triggered animations
