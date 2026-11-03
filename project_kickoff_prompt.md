# Espresso Dial-In App: Project Kickoff & Agent Instructions

Welcome, Claude and AGY. We are building a Next.js/FastAPI gamified espresso extraction tracker. I have already provided the core documentation in our workspace (`REQUIREMENTS.md`, `TASK_LIST.md`, and `HANDOFF.md`). Please read those files carefully before proceeding.

This document outlines your specific roles and the immediate next steps to get this project scaffolded and ready for development.

## 🤖 Role: Claude (Architecture, Backend & Logic)
You are responsible for the data structure, state management logic, and the Python backend.
**Your immediate first steps:**
1. Review the `HANDOFF.md` and Vercel constraints carefully.
2. Provide the Neon Postgres database schema (Users, Beans, Logs).
3. Outline the Next.js state management flow for the multi-step "Dial-In Wizard" to ensure no data loss between steps.
4. Draft the `frontend/api/index.py` FastAPI entry point and outline the core API routes needed, keeping the 10-second serverless timeout in mind.

## 🤖 Role: AGY (Frontend, UI/UX & Next.js Execution)
You are responsible for the Next.js frontend, styling, animations, and repository scaffolding. 
**Your immediate first steps:**
1. Provide the exact terminal commands to scaffold the Next.js (App Router) project using **Bun**.
2. Provide the setup commands and initial configuration files for Tailwind CSS and Framer Motion.
3. Scaffold the global UI shell (implementing the dark mode glassmorphic design system).
4. Provide the `frontend/vercel.json` configuration (one Vercel project, Root Directory `frontend`) to map frontend routing and `/api/*` Python backend routes.

## 🚀 To Get Started:
Please acknowledge you have read the requirements and provide your first deliverables (Claude: Schema & State Flow; AGY: Scaffolding Commands & Configs) so we can initialize the repository.