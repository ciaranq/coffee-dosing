// Dial-In Wizard draft: pure state logic. Contract: docs/contract/wizard-state.md.
// Weights are strings in state (the keypad builds "18." mid-entry); parse only to compute.

import { computeShot, parseGrams, type ShotOutcome } from "./math";

export type WeightKey = "pfEmpty" | "pfDry" | "cupEmpty" | "cupFull" | "pfWet";
export type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Taste = "sour" | "balanced" | "bitter";
export type TextField = "grindExternal" | "burrInternal" | "shotTimeS";

export interface Draft {
  v: 2;
  clientId: string;
  step: Step;
  weights: Partial<Record<WeightKey, string>>;
  beanId?: string;
  taste?: Taste;
  grindExternal?: string;
  burrInternal?: string;
  shotTimeS?: string;
  updatedAt: number;
}

// v2: the guided flow gained "zero your scale" and "pull your shot" steps, so old v1 drafts are ignored.
export const STORAGE_KEY = "dialin:draft:v2";
export const STALE_MS = 12 * 60 * 60 * 1000;

// Guided flow: 1 zero your scale, 2 empty portafilter, 3 empty cup, 4 portafilter with coffee,
// 5 pull your shot, 6 cup with espresso, 7 wet portafilter (optional), 8 result and tasting.
export const STEP_WEIGHT = {
  2: "pfEmpty",
  3: "cupEmpty",
  4: "pfDry",
  6: "cupFull",
  7: "pfWet",
} as const satisfies Partial<Record<Step, WeightKey>>;

/** Steps with nothing to weigh: the user just does the thing and taps on. */
export const INSTRUCTION_STEPS = [1, 5] as const;
export const LAST_GUIDED_STEP = 7;
export const RESULT_STEP = 8;

export type WeightStep = keyof typeof STEP_WEIGHT;
export const isWeightStep = (step: Step): step is WeightStep => step in STEP_WEIGHT;

export type KeypadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back" | "clear";

export function newClientId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // randomUUID needs a secure context; fall back for http on a local network
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function createDraft(now: number = Date.now()): Draft {
  return { v: 2, clientId: newClientId(), step: 1, weights: {}, updatedAt: now };
}

/** Apply one keypad press to the text being edited. Max 4 integer digits (5000 g limit) and `decimals` places. */
export function applyKey(current: string, key: KeypadKey, decimals = 2): string {
  if (key === "clear") return "";
  if (key === "back") return current.slice(0, -1);
  if (key === ".") {
    if (decimals === 0 || current.includes(".")) return current;
    return current === "" ? "0." : current + ".";
  }
  const [int, frac] = current.split(".");
  if (current.includes(".")) return frac.length >= decimals ? current : current + key;
  if (int === "0") return key === "0" ? current : key;
  return int.length >= 4 ? current : current + key;
}

function weight(draft: Draft, key: WeightKey): number | null {
  return parseGrams(draft.weights[key]);
}

/** Why the current step cannot advance yet, or null when it can. Mirrors server and DB checks. */
export function stepError(draft: Draft): string | null {
  const { step } = draft;
  if (!isWeightStep(step)) return null; // instruction steps and the result need no reading
  const key = STEP_WEIGHT[step];
  const value = weight(draft, key);
  if (step === 7 && !draft.weights[key]) return null; // wet puck is optional
  if (value === null) return "Enter a weight to continue.";
  if (value <= 0 && step !== 7) return "Weight must be above zero.";
  if (step === 4) {
    const empty = weight(draft, "pfEmpty");
    if (empty !== null && value <= empty) return "Portafilter with coffee must weigh more than the empty portafilter.";
  }
  if (step === 6) {
    const empty = weight(draft, "cupEmpty");
    if (empty !== null && value <= empty) return "Cup with espresso must weigh more than the empty cup.";
  }
  if (step === 7) {
    const dry = weight(draft, "pfDry");
    if (dry !== null && value < dry) return "Wet portafilter cannot weigh less than the dry one.";
  }
  return null;
}

export function canAdvance(draft: Draft): boolean {
  return stepError(draft) === null;
}

/** First step whose data is missing or invalid: how far the draft can legitimately be shown. */
export function maxReachableStep(draft: Draft): Step {
  for (const s of [1, 2, 3, 4, 5, 6, 7] as const) {
    if (stepError({ ...draft, step: s }) !== null) return s;
  }
  return RESULT_STEP;
}

export function shotFromDraft(draft: Draft): ShotOutcome | null {
  const pfEmpty = weight(draft, "pfEmpty");
  const pfDry = weight(draft, "pfDry");
  const cupEmpty = weight(draft, "cupEmpty");
  const cupFull = weight(draft, "cupFull");
  if (pfEmpty === null || pfDry === null || cupEmpty === null || cupFull === null) return null;
  const pfWet = weight(draft, "pfWet");
  return computeShot({ pfEmpty, pfDry, cupEmpty, cupFull, pfWet });
}

export type Action =
  | { type: "key"; field: WeightKey | TextField; key: KeypadKey }
  | { type: "next" }
  | { type: "back" }
  | { type: "goTo"; step: number }
  | { type: "taste"; taste: Taste | undefined }
  | { type: "replace"; draft: Draft }
  | { type: "reset" };

const clampStep = (n: number): Step => Math.min(RESULT_STEP, Math.max(1, Math.trunc(n) || 1)) as Step;

export function reducer(state: Draft, action: Action, now: number = Date.now()): Draft {
  switch (action.type) {
    case "key": {
      const isWeight = action.field in STEP_WEIGHT_SET;
      const decimals = action.field === "shotTimeS" || action.field === "grindExternal" || action.field === "burrInternal" ? 1 : 2;
      if (isWeight) {
        const f = action.field as WeightKey;
        return { ...state, weights: { ...state.weights, [f]: applyKey(state.weights[f] ?? "", action.key, decimals) }, updatedAt: now };
      }
      const f = action.field as TextField;
      return { ...state, [f]: applyKey(state[f] ?? "", action.key, decimals), updatedAt: now };
    }
    case "next":
      if (!canAdvance(state) || state.step === RESULT_STEP) return state;
      return { ...state, step: (state.step + 1) as Step, updatedAt: now };
    case "back":
      return state.step === 1 ? state : { ...state, step: (state.step - 1) as Step, updatedAt: now };
    case "goTo": {
      // never show a step ahead of the data (clamp back to the first incomplete step)
      const target = Math.min(clampStep(action.step), maxReachableStep(state)) as Step;
      return target === state.step ? state : { ...state, step: target, updatedAt: now };
    }
    case "taste":
      return { ...state, taste: action.taste, updatedAt: now };
    case "replace":
      return action.draft;
    case "reset":
      return createDraft(now);
  }
}

const STEP_WEIGHT_SET: Record<WeightKey, true> = { pfEmpty: true, pfDry: true, cupEmpty: true, cupFull: true, pfWet: true };

export function isStale(draft: Draft, now: number = Date.now()): boolean {
  return now - draft.updatedAt > STALE_MS;
}

/** True when the draft holds any entered data worth offering to resume. */
export function hasProgress(draft: Draft): boolean {
  return Object.values(draft.weights).some((v) => !!v) || draft.step > 1;
}

// ---- persistence (every access wrapped: private mode and blocked storage throw) ----

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<Draft>;
    if (d.v !== 2 || typeof d.clientId !== "string" || typeof d.updatedAt !== "number") return null;
    if (typeof d.step !== "number" || d.step < 1 || d.step > RESULT_STEP || !Number.isInteger(d.step)) return null;
    if (typeof d.weights !== "object" || d.weights === null) return null;
    const weights: Draft["weights"] = {};
    for (const k of Object.keys(STEP_WEIGHT_SET) as WeightKey[]) {
      const v = (d.weights as Record<string, unknown>)[k];
      if (typeof v === "string") weights[k] = v;
    }
    const str = (v: unknown) => (typeof v === "string" ? v : undefined);
    const taste = d.taste === "sour" || d.taste === "balanced" || d.taste === "bitter" ? d.taste : undefined;
    return {
      v: 2,
      clientId: d.clientId,
      step: d.step as Step,
      weights,
      beanId: str(d.beanId),
      taste,
      grindExternal: str(d.grindExternal),
      burrInternal: str(d.burrInternal),
      shotTimeS: str(d.shotTimeS),
      updatedAt: d.updatedAt,
    };
  } catch {
    return null;
  }
}

export function loadDraft(storage: StorageLike | undefined): Draft | null {
  try {
    return parseDraft(storage?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return null;
  }
}

export function saveDraft(storage: StorageLike | undefined, draft: Draft): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable: state still lives in memory */
  }
}

export function clearDraft(storage: StorageLike | undefined): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
