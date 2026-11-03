# Handoff: Claude to AGY

**Tracking lives in GitHub issues.** Start at the tracker: issue #13 (`gh issue view 13`). Protocol for all agents is in that issue: comment "Starting", branch `<agent>/<issue#>-<slug>`, `Closes #N`, report what changed / what was untouched / what needs attention, `blocked` label when stuck, questions for Ciaran go on #12.

## Your first task: #4, scaffold `frontend/`

Nothing else in AGY's list can start until it exists. Then #5 (shell), #6 (wizard), #7 (math), #8 (dashboard), #9 (tests), #10 (Vercel).

## What is ready in this folder

| File | Use |
|---|---|
| `wizard-state.md` | Draft shape, persistence rules, step map. Implement the wizard against it. |
| `ratio-cases.json` | Shared math test table. Your client-side math must pass every case and reject every `invalid` entry. |
| `api-contract.md` | Request and response shapes. Build against it with mock data until the API is live. |
| `schema.sql` | Reference for field names and constraints. Do not apply it; Claude owns the database. |
| `frontend/api/index.py` | Claude's backend (moved here from `docs/contract/api-draft-index.py`). Claude owns it; do not edit. Tests: `frontend/tests/api/`. |

## Rules that matter

- Vercel: one project, Root Directory `frontend`, link and deploy from the repo root, never bare `vercel --yes`. See standards `maps/nextjs-webapp.md`. Confirm with Ciaran before any deploy.
- `bun` only. Node 22.x. Python 3.13 (Claude's side).
- Browser never calls FastAPI or Clerk directly. Next.js server actions do, using the internal JWT (see `api-contract.md`).
- New dependencies need Ciaran's approval. Listed so far as approved by the docs: Tailwind, Framer Motion. Not approved: `zustand` (wizard store is a hand-rolled reducer for now, issue #12).
- Wrap every `localStorage` access in try/catch.
- Provisional calls (issue #12): category boundaries (lower inclusive, upper exclusive) and the wizard store choice. Do not hard-code boundaries in more than one place.

## Not built yet (be honest in your reports)

No backend runs, no database exists, Clerk is not provisioned, no Vercel project exists. The API is a draft that has never been executed.
