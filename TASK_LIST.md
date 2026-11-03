# TASK_LIST.md

- [Claude] Architect the Neon Postgres database schema for users, beans (roaster, origin, roast date), and extraction logs (dose, yield, time, grind size, taste rating). Optimize connections for Vercel's stateless serverless environment.
- [Claude] Design the state management flow for the multi-step "Dial-In Wizard" to ensure no data is lost if the user minimizes the browser while weighing.
- [Claude] Draft the FastAPI routing logic (`frontend/api/index.py`) and Next.js server actions for secure data mutation and retrieval, ensuring all functions execute within Vercel's 10-second timeout limit.
- [AGY] Initialize the Next.js project using Bun and scaffold the standard directory structure.
- [AGY] Build the global UI shell implementing the glassmorphic Tailwind CSS design system and Google Fonts integration.
- [AGY] Develop the interactive "Dial-In Wizard" component using Framer Motion for step transitions and custom large numeric keypads for physical input.
- [AGY] Implement the client-side math logic to instantly calculate and display the brew ratio and retained water metrics.
- [AGY] Build the historical logging dashboard with visual charts mapping grind size adjustments against taste ratings.
- [AGY] Write autonomous UI tests verifying the wizard flow, math calculations, and state persistence.
- [AGY] Prepare the Vercel deployment configuration (`frontend/vercel.json`; create one project, set Root Directory to `frontend`, link and deploy from the repo root) using Node.js 22 LTS settings within the Bun build environment, mapping `/api/*` routes to the Python serverless function.
