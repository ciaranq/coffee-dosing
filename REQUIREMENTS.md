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
*   **Palette:** Taken from jackmurat.com, on a dark mode canvas: ink `#111111`, paper `#f4efe7`, signal red `#ee3740` (primary accent), bone `#e8e1d4`, stone `#c9bfae`, earth `#6b4a2b`. Tokens live in `frontend/src/app/globals.css`.
*   **Typography:** Clean, legible Google Fonts (e.g., Inter or Outfit) with distinct font weights for metric readouts.
*   **Animations:** Framer Motion for micro-animations (smooth transitions between wizard steps, pulsing indicators when waiting for scale inputs, liquid fill animations for the brew ratio).
*   **Accessibility:** Large, tap-friendly touch targets and oversized numeric keypads designed specifically for users operating the app while standing at a coffee machine with potentially wet hands.

## 4. Core Features
*   **The Dial-In Wizard:** A quick, easy guide at your machine, in the order you actually do things:
    1. Zero your scale
    2. Empty portafilter weight
    3. Empty cup weight
    4. Portafilter with coffee weight (Dry Dose calculation)
    5. Pull your shot
    6. Cup with espresso weight (Espresso Yield calculation)
    7. Wet portafilter weight, optional (Water Retention calculation)
*   **Real-Time Analytics Engine:** Instantly calculates the brew ratio (e.g., 1:2.6) and visually plots it on a spectrum (Ristretto -> Normale -> Lungo).
*   **Tasting & Grind Log:** Users rate the shot (sour, balanced, bitter) and record the machine's external grind size setting and internal burr setting.
*   **Educational Insights:** Contextual tooltips explaining *why* a shot pulled too fast (channelling, stale beans, light tamp) or too slow, helping users adjust their grinder for the next pull.
*   **Try next:** After each shot, one plain instruction for the next one, such as "grind one step finer and let the shot run longer (aim for about 1 : 2.2)". It only moves the grinder when shot time and taste agree.

## 5. Future Features (not built)
*   **Video analysis of the shot pull:** record the pull and analyse it (flow rate, pre-infusion, channelling signs, shot time) to give better suggestions. Tracked in a GitHub issue.
*   **Machine-specific guidance:** the machine selector exists but every machine behaves the same today. Later, tailor grinder scale, basket size, target ratios and advice to the selected machine.
*   **Shot timer:** time the pull in the "Pull your shot" step and fill in the shot time automatically.
