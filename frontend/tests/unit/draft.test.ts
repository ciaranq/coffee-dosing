import { describe, expect, it } from "bun:test";
import {
  STALE_MS,
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

const filled = (): Draft => {
  let d = createDraft(1000);
  d = type(d, "pfEmpty", "200");
  d = reducer(d, { type: "next" });
  d = type(d, "pfDry", "218");
  d = reducer(d, { type: "next" });
  d = type(d, "cupEmpty", "100");
  d = reducer(d, { type: "next" });
  d = type(d, "cupFull", "136");
  d = reducer(d, { type: "next" });
  return d;
};

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
  it("cannot advance past an empty step", () => {
    const d = createDraft(0);
    expect(canAdvance(d)).toBe(false);
    expect(reducer(d, { type: "next" }).step).toBe(1);
  });

  it("walks steps 1 to 5, wet puck is optional", () => {
    const d = filled();
    expect(d.step).toBe(5);
    expect(canAdvance(d)).toBe(true);
    expect(reducer(d, { type: "next" }).step).toBe(6);
  });

  it("blocks a dry portafilter that is not heavier than the empty one", () => {
    let d = createDraft(0);
    d = type(d, "pfEmpty", "200");
    d = reducer(d, { type: "next" });
    d = type(d, "pfDry", "200");
    expect(stepError(d)).toContain("more than the empty portafilter");
    expect(reducer(d, { type: "next" }).step).toBe(2);
  });

  it("blocks a full cup that is not heavier than the empty cup", () => {
    let d = filled();
    d = reducer(d, { type: "goTo", step: 4 });
    d = reducer(d, { type: "key", field: "cupFull", key: "clear" });
    d = type(d, "cupFull", "90");
    expect(stepError(d)).toContain("more than the empty cup");
  });

  it("blocks a wet portafilter lighter than dry", () => {
    let d = filled();
    d = type(d, "pfWet", "217");
    expect(stepError(d)).toContain("cannot weigh less");
  });

  it("goTo clamps to the first incomplete step", () => {
    let d = createDraft(0);
    d = type(d, "pfEmpty", "200");
    expect(maxReachableStep(d)).toBe(2);
    expect(reducer(d, { type: "goTo", step: 5 }).step).toBe(2);
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
  it("round-trips through storage", () => {
    const s = memory();
    const d = filled();
    saveDraft(s, d);
    expect(loadDraft(s)).toEqual({ ...d, beanId: undefined, taste: undefined, grindExternal: undefined, burrInternal: undefined, shotTimeS: undefined });
  });

  it("keeps the same clientId so a retried save stays idempotent", () => {
    const s = memory();
    const d = filled();
    saveDraft(s, d);
    expect(loadDraft(s)?.clientId).toBe(d.clientId);
  });

  it("rejects corrupt or wrong-version data", () => {
    expect(parseDraft("{")).toBe(null);
    expect(parseDraft(JSON.stringify({ v: 2 }))).toBe(null);
    expect(parseDraft(JSON.stringify({ v: 1, clientId: "x", updatedAt: 1, step: 9, weights: {} }))).toBe(null);
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
  });
});
