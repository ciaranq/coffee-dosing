# API Contract

Base path: `/api`. One FastAPI app, entry point `frontend/api/index.py`, deployed with the Next.js app (Vercel Root Directory = `frontend`). Every request must finish well inside 10 seconds. Each route below is one indexed query.

## Auth flow (Clerk)

1. Browser talks only to Next.js. Clerk session is verified in a **server action / route handler** (`auth()` from Clerk).
2. The server action mints a short-lived internal JWT and calls FastAPI with `Authorization: Bearer <jwt>`.
3. FastAPI never calls Clerk. It verifies the JWT and upserts the user by `auth_subject`.

Internal JWT: HS256, secret `INTERNAL_JWT_SECRET`, claims `sub` = Clerk user id, `aud` = `dialin-api`, `exp` = now + 60s. Never sent to the browser.

Environment variables: `DATABASE_URL` (Neon `-pooler` DSN), `INTERNAL_JWT_SECRET`, Clerk keys (set up when Clerk is provisioned via the Vercel Marketplace). Never commit `.env`.

## Conventions

- JSON in and out. Weights in grams as JSON numbers with up to 2 decimals.
- `category` is added by the API to every log: `"ristretto" | "normale" | "lungo"`. Thresholds and test cases: `ratio-cases.json`.
- Errors: FastAPI defaults. `401` bad or missing token, `404` not found, `422` validation (`{ "detail": [...] }`).

## Log object

```json
{
  "id": "uuid", "client_id": "uuid", "bean_id": "uuid|null",
  "portafilter_empty_g": 200.0, "portafilter_dry_g": 218.0,
  "cup_empty_g": 100.0, "cup_full_g": 136.0, "portafilter_wet_g": 221.5,
  "dose_g": 18.0, "yield_g": 36.0, "ratio": 2.0, "retained_water_g": 3.5,
  "shot_time_s": 28.5, "taste": "balanced", "grind_external": 12.0, "burr_internal": 4.0,
  "notes": null, "created_at": "2026-11-03T02:10:00Z", "category": "normale"
}
```

`dose_g`, `yield_g`, `ratio`, `retained_water_g` are read-only (computed by Postgres).

## Routes

| Method | Path | Status | Purpose |
|---|---|---|---|
| GET | `/api/health` | drafted | Liveness |
| POST | `/api/logs` | drafted | Create log. Idempotent on `(user, client_id)`: a repeat returns the existing row. Returns `201` + log object. |
| GET | `/api/logs?bean_id=&before=&limit=` | drafted | List, newest first. `limit` 1-100 (default 50). `before` = ISO timestamp for pagination. |
| PATCH | `/api/logs/{id}` | planned | Add or change `taste`, `grind_external`, `burr_internal`, `shot_time_s`, `notes`, `bean_id` after tasting. |
| DELETE | `/api/logs/{id}` | planned | Delete a log. |
| GET | `/api/logs/stats?bean_id=` | planned | Grind vs taste aggregates: `[{ grind_external, taste, count, avg_ratio }]`. Until it exists, build charts from `GET /api/logs`. |
| GET | `/api/beans` | planned | List non-archived beans. |
| POST | `/api/beans` | planned | `{ name, roaster?, origin?, roast_date? }` |
| PATCH | `/api/beans/{id}` | planned | Edit or archive (`archived_at`). Beans are archived, not deleted. |

"drafted" means the code is in `api-draft-index.py` (untested, never run). "planned" means the contract is fixed but nothing is written.

## Ownership

Every row is scoped to the caller. `logs.bean_id` is enforced by a composite foreign key `(bean_id, user_id)` to `beans(id, user_id)`, so a log can never point at another user's bean. A bad or foreign `bean_id` returns `422 "unknown bean_id"` (the same response for both, so bean ids cannot be probed). Every query filters on `user_id`. PATCH and DELETE on logs and beans must include `and user_id = <caller>` and return `404` when no row matches.

## POST /api/logs request body

```json
{
  "client_id": "uuid",
  "bean_id": null,
  "portafilter_empty_g": 200.0, "portafilter_dry_g": 218.0,
  "cup_empty_g": 100.0, "cup_full_g": 136.0, "portafilter_wet_g": null,
  "shot_time_s": null, "taste": null, "grind_external": null, "burr_internal": null, "notes": null
}
```

Validation (server, also enforced by DB check constraints): `portafilter_dry_g > portafilter_empty_g`, `cup_full_g > cup_empty_g`, `portafilter_wet_g >= portafilter_dry_g` when present, weights 0-5000, `shot_time_s` 0-120.
