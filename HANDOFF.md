# HANDOFF.md

## Context for Architecture and Execution Agents
This application translates a highly physical, hardware-dependent process into a streamlined digital workflow. The core mathematical logic must replicate standard barista dialing-in procedures. The application must not assume fixed weights, as hardware varies (e.g., 54mm Breville baskets vs. 58mm commercial baskets). The backend is deployed on Vercel's free tier, so the Python architecture must strictly adhere to serverless constraints.

## Vercel Serverless Architecture Limits (Critical)
*   **Execution Time:** All FastAPI routes MUST complete execution and return a response within 10 seconds.
*   **Memory:** Max 1024 MB RAM per function execution.
*   **State:** The environment is stateless. No local file system storage (except temporary `/tmp`).
*   **Database:** Use connection pooling for all Neon Postgres interactions to handle rapid spin-up/spin-down of the serverless functions. Do not rely on persistent connections.
*   **Routing:** All Python endpoints must be routed through a single `api/index.py` ASGI application entry point.

## Core Mathematical Formulas to Implement
*   **Dry Dose (g):** `Portafilter with Dry Coffee - Empty Portafilter`
*   **Liquid Yield (g):** `Cup with Espresso - Empty Cup`
*   **Brew Ratio:** `1 : (Liquid Yield / Dry Dose)` 
*   **Retained Water (g):** `Wet Portafilter - Portafilter with Dry Coffee`

## Target Ratio Logic (To be visualized in UI)
*   **1:1 to 1:1.5** = Ristretto (Highly concentrated, viscous, heavy body)
*   **1:1.5 to 1:2.5** = Normale / Traditional Espresso (Balanced, sweet spot for most medium/dark roasts)
*   **1:2.5 to 1:4** = Lungo (Lighter body, higher extraction, highlights acidity in light/fresh roasts)

## UX Directive
The user will be operating this app while standing at a coffee machine with wet hands. The UI buttons must be large, tap-friendly, and require minimal typing. Use big numeric keypads for inputting scale data rather than native browser number inputs.
