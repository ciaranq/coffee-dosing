// Shot history shape (matches the API log object in docs/contract/api-contract.md, trimmed to what the UI needs)
// plus a localStorage-backed store used until the backend, Neon and Clerk are live.

import { parseGrams, type Category } from "./math";
import { shotFromDraft, type Draft, type StorageLike, type Taste } from "./draft";

export interface ShotLog {
  id: string;
  client_id: string;
  dose_g: number;
  yield_g: number;
  ratio: number;
  retained_water_g: number | null;
  shot_time_s: number | null;
  taste: Taste | null;
  grind_external: number | null;
  burr_internal: number | null;
  category: Category;
  created_at: string;
  source: "local" | "sample";
}

export const HISTORY_KEY = "dialin:history:v1";

/** Build a log from a finished draft. Returns null while the draft is incomplete or invalid. */
export function logFromDraft(draft: Draft, now: Date = new Date()): ShotLog | null {
  const outcome = shotFromDraft(draft);
  if (!outcome || !outcome.ok) return null;
  const { result } = outcome;
  return {
    id: draft.clientId,
    client_id: draft.clientId,
    dose_g: result.dose,
    yield_g: result.yield,
    ratio: result.ratio,
    retained_water_g: result.retainedWater,
    shot_time_s: parseGrams(draft.shotTimeS),
    taste: draft.taste ?? null,
    grind_external: parseGrams(draft.grindExternal),
    burr_internal: parseGrams(draft.burrInternal),
    category: result.category,
    created_at: now.toISOString(),
    source: "local",
  };
}

export function loadHistory(storage: StorageLike | undefined): ShotLog[] {
  try {
    const raw = storage?.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ShotLog[]).filter((l) => typeof l?.client_id === "string") : [];
  } catch {
    return [];
  }
}

/** Idempotent on client_id, like POST /api/logs: saving the same draft twice keeps one row. */
export function addHistory(storage: StorageLike | undefined, log: ShotLog): ShotLog[] {
  const existing = loadHistory(storage);
  const next = existing.some((l) => l.client_id === log.client_id) ? existing : [log, ...existing];
  try {
    storage?.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return next;
}

function sample(
  n: number,
  daysAgo: number,
  dose: number,
  yld: number,
  time: number,
  grind: number,
  burr: number,
  taste: Taste,
  wet: number | null,
): ShotLog {
  const ratio = Math.round((yld / dose) * 1000) / 1000;
  const category: Category = ratio < 1.5 ? "ristretto" : ratio < 2.5 ? "normale" : "lungo";
  const created = new Date(Date.UTC(2026, 10, 3, 6, 30) - daysAgo * 86_400_000).toISOString();
  return {
    id: `sample-${n}`,
    client_id: `sample-${n}`,
    dose_g: dose,
    yield_g: yld,
    ratio,
    retained_water_g: wet,
    shot_time_s: time,
    taste,
    grind_external: grind,
    burr_internal: burr,
    category,
    created_at: created,
    source: "sample",
  };
}

/** Sample dial-in session shown until real logs exist: sour at coarse settings, bitter at fine ones. */
export const SAMPLE_LOGS: ShotLog[] = [
  sample(1, 9, 18, 52, 17, 18, 6, "sour", 3.4),
  sample(2, 8, 18, 46, 20, 16, 6, "sour", 3.6),
  sample(3, 6, 18, 41, 24, 14, 5, "sour", 3.8),
  sample(4, 5, 18, 38, 27, 12, 5, "balanced", 4.0),
  sample(5, 3, 18, 36, 29, 11, 4, "balanced", 4.1),
  sample(6, 2, 18, 33, 34, 9, 4, "bitter", 4.4),
  sample(7, 1, 18, 29, 38, 7, 3, "bitter", 4.6),
  sample(8, 0, 18, 36, 28, 11, 4, "balanced", 4.1),
];
