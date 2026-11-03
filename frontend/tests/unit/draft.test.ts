import { describe, expect, it } from "bun:test";
import {
  INSTRUCTION_STEPS,
  LAST_GUIDED_STEP,
  RESULT_STEP,
  STALE_MS,
  STEP_WEIGHT,
  STORAGE_KEY,
  applyKey,
  canAdvance,
  clearDraft,
  createDraft,
  hasProgress,
  isStale,
  loadDraft,
  maxReachableStep,
  parseDraft,
  reducer,
  saveDraft,
  shotFromDraft,
  stepError,
  type Draft,
  type KeypadKey,
  type StorageLike,
  type WeightKey,
} from "../../src/lib/draft";

const memory = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
};

const type = (d: Draft, field: WeightKey, text: string): Draft =>
  [...text].reduce((acc, ch) => reducer(acc, { type: "key", field, key: ch as KeypadKey }), d);

const next = (d: Draft) => reducer(d, { type: "next" });

/** Walks the real flow to the wet-portafilter step (7): zero, pfEmpty, cupEmpty, pfDry, pull, cupFull. */
const filled = (): Draft => {
  let d = createDraft(1000);
  d = next(d); // 1 zero your scale (instruction)
  d = type(d, "pfEmpty", "200");
  d = next(d); // 2 empty portafilter
  d = type(d, "cupEmpty", "100");
  d = next(d); // 3 empty cup
  d = type(d, "pfDry", "218");
  d = next(d); // 4 portafilter with coffee
  d = next(d); // 5 pull your shot (instruction)
  d = type(d, "cupFull", "136");
  d = next(d); // 6 cup with espresso
  return d;
};

describe("step map", () => {
  it("follows the guided order: zero, empty portafilter, empty cup, full portafilter, pull, full cup, wet portafilter", () => {
    expect(INSTRUCTION_STEPS).toEqual([1, 5]);
    expect(STEP_WEIGHT).toEqual({ 2: "pfEmpty", 3: "cupEmpty", 4: "pfDry", 6: "cupFull", 7: "pfWet" });
    expect(LAST_GUIDED_STEP).toBe(7);
    expect(RESULT_STEP).toBe(8);
  });
});

describe("applyKey", () => {
  it("builds decimals mid-entry without losing the trailing dot", () => {
    expect(applyKey("18", ".")).toBe("18.");
    expect(applyKey("18.", "5")).toBe("18.5");
  });
  it("starts with 0. when dot is first", () => {
    expect(applyKey("", ".")).toBe("0.");
  });
  it("ignores a second dot, extra decimals and a 5th integer digit", () => {
    expect(applyKey("1.5", ".")).toBe("1.5");
    expect(applyKey("1.55", "9")).toBe("1.55");
    expect(applyKey("1234", "5")).toBe("1234");
    expect(applyKey("1.5", "9", 1)).toBe("1.5");
  });
  it("does not stack leading zeros", () => {
    expect(applyKey("0", "0")).toBe("0");
    expect(applyKey("0", "7")).toBe("7");
  });
  it("supports backspace and clear", () => {
    expect(applyKey("18.5", "back")).toBe("18.");
    expect(applyKey("", "back")).toBe("");
    expect(applyKey("18.5", "clear")).toBe("");
  });
});

describe("wizard flow", () => {
  it("starts on zero your scale, which needs no reading", () => {
    const d = createDraft(0);
    expect(d.step).toBe(1);
    expect(stepError(d)).toBe(null);
    expect(next(d).step).toBe(2);
  });

  it("cannot advance past a weight step with no reading", () => {
    const d = next(createDraft(0)); // step 2
    expect(canAdvance(d)).toBe(false);
    expect(next(d).step).toBe(2);
  });

  it("walks every step in order and reaches the result", () => {
    let d = filled();
    expect(d.step).toBe(7);
    expect(canAdvance(d)).toBe(true); // wet puck is optional
    d = next(d);
    expect(d.step).toBe(RESULT_STEP);
    expect(next(d).step).toBe(RESULT_STEP);
  });

  it("pull your shot needs no reading", () => {
    let d = createDraft(0);
    d = next(d);
    d = type(d, "pfEmpty", "200");
    d = next(d);
    d = type(d, "cupEmpty", "100");
    d = next(d);
    d = type(d, "pfDry", "218");
    d = next(d);
    expect(d.step).toBe(5);
    expect(stepError(d)).toBe(null);
    expect(next(d).step).toBe(6);
  });

  it("blocks a dry portafilter that is not heavier than the empty one", () => {
    let d = createDraft(0);
    d = next(d);
    d = type(d, "pfEmpty", "200");
    d = next(d);
    d = type(d, "cupEmpty", "100");
    d = next(d);
    d = type(d, "pfDry", "200");
    expect(stepError(d)).toContain("more than the empty portafilter");
    expect(next(d).step).toBe(4);
  });

  it("blocks a full cup that is not heavier than the empty cup", () => {
    let d = reducer(filled(), { type: "goTo", step: 6 }); // back to the cup with espresso
    d = reducer(d, { type: "key", field: "cupFull", key: "clear" });
    d = type(d, "cupFull", "90");
    expect(stepError(d)).toContain("more than the empty cup");
  });

  it("blocks a wet portafilter lighter than dry", () => {
    let d = filled(); // already on step 7, the wet portafilter
    d = type(d, "pfWet", "217");
    expect(stepError(d)).toContain("cannot weigh less");
  });

  it("goTo clamps to the first step whose data is missing", () => {
    let d = next(createDraft(0)); // step 2
    d = type(d, "pfEmpty", "200");
    expect(maxReachableStep(d)).toBe(3);
    expect(reducer(d, { type: "goTo", step: 7 }).step).toBe(3);
  });

  it("goTo never shows a step past the first missing reading", () => {
    // zero your scale needs no reading, so a fresh draft can reach step 2 but no further
    expect(reducer(createDraft(0), { type: "goTo", step: 8 }).step).toBe(2);
  });

  it("back never goes below step 1", () => {
    expect(reducer(createDraft(0), { type: "back" }).step).toBe(1);
  });

  it("computes the shot from the draft", () => {
    const outcome = shotFromDraft(filled());
    expect(outcome?.ok).toBe(true);
    if (outcome?.ok) {
      expect(outcome.result.ratio).toBe(2);
      expect(outcome.result.category).toBe("normale");
    }
  });
});

describe("persistence", () => {
  const stripped = (d: Draft): Draft => ({
    ...d,
    beanId: undefined,
    taste: undefined,
    grindExternal: undefined,
    burrInternal: undefined,
    shotTimeS: undefined,
  });

  it("round-trips through storage", () => {
    const s = memory();
    const d = filled();
    saveDraft(s, d);
    expect(loadDraft(s)).toEqual(stripped(d));
  });

  it("stores under a new key and version so drafts from the old 6-step flow are ignored", () => {
    expect(STORAGE_KEY).toBe("dialin:draft:v2");
    expect(createDraft(0).v).toBe(2);
    expect(parseDraft(JSON.stringify({ v: 1, clientId: "x", updatedAt: 1, step: 3, weights: {} }))).toBe(null);
  });

  it("keeps the same clientId so a retried save stays idempotent", () => {
    const s = memory();
    const d = filled();
    saveDraft(s, d);
    expect(loadDraft(s)?.clientId).toBe(d.clientId);
  });

  it("rejects corrupt or out-of-range data", () => {
    expect(parseDraft("{")).toBe(null);
    expect(parseDraft(JSON.stringify({ v: 3 }))).toBe(null);
    expect(parseDraft(JSON.stringify({ v: 2, clientId: "x", updatedAt: 1, step: 9, weights: {} }))).toBe(null);
    expect(parseDraft(JSON.stringify({ v: 2, clientId: "x", updatedAt: 1, step: 0, weights: {} }))).toBe(null);
    expect(parseDraft(JSON.stringify({ v: 2, clientId: "x", updatedAt: 1, step: 8, weights: {} }))?.step).toBe(8);
    expect(parseDraft(null)).toBe(null);
  });

  it("survives storage that throws", () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => saveDraft(broken, createDraft(0))).not.toThrow();
    expect(loadDraft(broken)).toBe(null);
    expect(() => clearDraft(broken)).not.toThrow();
  });

  it("clears the stored draft", () => {
    const s = memory();
    saveDraft(s, createDraft(0));
    expect(s.data.has(STORAGE_KEY)).toBe(true);
    clearDraft(s);
    expect(s.data.has(STORAGE_KEY)).toBe(false);
  });
});

describe("staleness", () => {
  it("flags drafts older than 12 hours", () => {
    const d = createDraft(0);
    expect(isStale(d, STALE_MS)).toBe(false);
    expect(isStale(d, STALE_MS + 1)).toBe(true);
  });
  it("only offers resume when there is progress", () => {
    expect(hasProgress(createDraft(0))).toBe(false);
    expect(hasProgress(filled())).toBe(true);
    expect(hasProgress(next(createDraft(0)))).toBe(true);
  });
});
