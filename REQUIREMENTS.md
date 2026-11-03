# REQUIREMENTS.md

## 1. Project Overview
A web-based espresso extraction tracker and dialing-in guide designed to help users achieve the perfect coffee ratio. The app walks users through the physical weighing steps (portafilter, dry dose, liquid yield, wet puck) and provides immediate feedback on their extraction ratio, categorizing the shot (Ristretto, Normale, Lungo) and logging it for future refinement.

## 2. Tech Stack
*   **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
*   **Backend / API:** Python 3.13 (mandatory), FastAPI, UV (for local dependency management, noting Vercel deployment constraints)
*   **Package Manager / Runtime:** Bun, Node 22.x
*   **Auth:** Clerk (session verified in Next.js; FastAPI trusts a short-lived internal JWT)
*   **Deployment:** Vercel (Frontend and Python Serverless Functions)
    *   **Vercel Constraints:** The Python backend will run as Serverless Functions on the free tier (10-second timeout, 1024 MB memory limit, stateless execution, cold starts). All API routing must be handled via a single `frontend/api/index.py` entry point configured in `frontend/vercel.json`. The Vercel project's Root Directory is `frontend` (see standards `maps/nextjs-webapp.md`). Background tasks are not supported.
*   **Database:** Neon Postgres (for global user authentication and persistent logging, utilizing connection pooling for serverless environments)

## 3. UI/UX Design System
*   **Aesthetic:** Modern glassmorphism (translucent panels, background blur, subtle white borders).
*   **Palette:** Vibrant, high-contrast gradients (e.g., deep espresso browns blending into vibrant energetic accents like cyan or amber) against a dark mode canvas.
*   **Typography:** Clean, legible Google Fonts (e.g., Inter or Outfit) with distinct font weights for metric readouts.
*   **Animations:** Framer Motion for micro-animations (smooth transitions between wizard steps, pulsing indicators when waiting for scale inputs, liquid fill animations for the brew ratio).
*   **Accessibility:** Large, tap-friendly touch targets and oversized numeric keypads designed specifically for users operating the app while standing at a coffee machine with potentially wet hands.

## 4. Core Features
*   **The Dial-In Wizard:** A step-by-step interactive flow capturing: 
    1. Empty portafilter weight
    2. Full portafilter weight (Dry Dose calculation)
    3. Empty cup weight
    4. Full cup weight (Espresso Yield calculation)
    5. Post-brew wet portafilter weight (Water Retention calculation)
*   **Real-Time Analytics Engine:** Instantly calculates the brew ratio (e.g., 1:2.6) and visually plots it on a spectrum (Ristretto -> Normale -> Lungo).
*   **Tasting & Grind Log:** Users rate the shot (sour, balanced, bitter) and record the machine's external grind size setting and internal burr setting.
*   **Educational Insights:** Contextual tooltips explaining *why* a shot pulled too fast (channelling, stale beans, light tamp) or too slow, helping users adjust their grinder for the next pull.
