# Dial-In Wizard State Contract

Goal: no data lost if the user minimises the browser mid-weigh.

```
keypad input -> reducer -> draft state -> persist (synchronously, every dispatch)
                                            localStorage["dialin:draft:v1"]
visibilitychange / pageshow -> rehydrate from localStorage
step 5 "Save" -> server action -> POST /api/logs (clientId) -> clear draft
```

## Draft shape

```ts
export type Draft = {
  v: 1;
  clientId: string;                  // crypto.randomUUID() at wizard start; sent as client_id on save
  step: 1 | 2 | 3 | 4 | 5 | 6;       // 6 = result + tasting
  weights: Partial<Record<'pfEmpty' | 'pfDry' | 'cupEmpty' | 'cupFull' | 'pfWet', string>>;
  beanId?: string;
  taste?: 'sour' | 'balanced' | 'bitter';
  grindExternal?: string;
  burrInternal?: string;
  shotTimeS?: string;
  updatedAt: number;                 // epoch ms
};
```

Step map: 1 empty portafilter, 2 portafilter with dry coffee, 3 empty cup, 4 cup with espresso, 5 wet portafilter after brew (skippable), 6 result and tasting.

## Rules

- **Persist on every dispatch**, not on unload. Mobile browsers do not reliably fire `beforeunload`.
- **Weights are strings in state.** The keypad builds values like `"18."` mid-entry, which a float would destroy. Parse only when computing.
- **Step mirrored in the URL** (`/dial-in?step=3`) so the back button behaves. The draft is the source of truth; the URL is a view of it. If the URL step is ahead of the draft's completed data, clamp back to the first incomplete step.
- **Stale drafts:** if `updatedAt` is older than about 12 hours, offer "Resume or discard".
- **Idempotent save:** `clientId` lives in the draft. A retried save returns the existing row (see api-contract.md), so a flaky network cannot create duplicates. Clear the draft only after a 2xx.
- **Validation before advancing** (mirrors server and DB checks): dry > empty portafilter, full cup > empty cup, wet >= dry (when entered).

## Store implementation: PROVISIONAL

I have defaulted to a hand-rolled `useReducer` plus `localStorage` store (about 30 lines), because `zustand` would be a new dependency that Ciaran has not approved. Keep the store behind one hook (`useDialInDraft`) so swapping later is a one-file change. Wrap every `localStorage` access in try/catch (private mode can throw) and fall back to in-memory state.
