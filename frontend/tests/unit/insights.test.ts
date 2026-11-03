import { describe, expect, it } from "bun:test";
import { insightsFor, recommendNext } from "../../src/lib/insights";

const ids = (r: ReturnType<typeof insightsFor>) => r.map((i) => i.id);

describe("insightsFor", () => {
  it("explains a fast shot", () => {
    expect(ids(insightsFor({ ratio: 2, category: "normale", shotTimeS: 15, taste: null }))).toEqual(["fast"]);
  });
  it("explains a slow shot", () => {
    expect(ids(insightsFor({ ratio: 2, category: "normale", shotTimeS: 41, taste: null }))).toEqual(["slow"]);
  });
  it("treats the 22 s and 35 s limits as in range", () => {
    expect(insightsFor({ ratio: 2, category: "normale", shotTimeS: 22, taste: null })).toEqual([]);
    expect(insightsFor({ ratio: 2, category: "normale", shotTimeS: 35, taste: null })).toEqual([]);
  });
  it("combines time and taste advice", () => {
    expect(ids(insightsFor({ ratio: 2.2, category: "normale", shotTimeS: 14, taste: "sour" }))).toEqual(["fast", "sour"]);
  });
  it("gives no advice when nothing was entered", () => {
    expect(insightsFor({ ratio: 2, category: "normale", shotTimeS: null, taste: null })).toEqual([]);
  });
  it("adds a note for ratio extremes unless the shot is balanced", () => {
    expect(ids(insightsFor({ ratio: 1.2, category: "ristretto", shotTimeS: null, taste: "bitter" }))).toContain("ristretto-note");
    expect(ids(insightsFor({ ratio: 3, category: "lungo", shotTimeS: null, taste: "balanced" }))).not.toContain("lungo-note");
  });
});

describe("recommendNext", () => {
  const facts = (shotTimeS: number | null, taste: "sour" | "balanced" | "bitter" | null, ratio = 2) => ({
    ratio,
    category: "normale" as const,
    shotTimeS,
    taste,
  });

  it("says nothing without a time or a taste", () => {
    expect(recommendNext(facts(null, null))).toBe(null);
  });

  it("sour and fast: grind finer and let the shot run longer", () => {
    const r = recommendNext(facts(15, "sour"))!;
    expect(r.grind).toBe("finer");
    expect(r.water).toBe("more");
    expect(r.targetRatio).toBe(2.2);
    expect(r.text).toBe("Next shot: grind one step finer and let the shot run longer (aim for about 1 : 2.2).");
  });

  it("bitter and slow: grind coarser and stop the shot sooner", () => {
    const r = recommendNext(facts(41, "bitter"))!;
    expect(r.grind).toBe("coarser");
    expect(r.water).toBe("less");
    expect(r.targetRatio).toBe(1.8);
    expect(r.text).toBe("Next shot: grind one step coarser and stop the shot sooner (aim for about 1 : 1.8).");
  });

  it("sour with a normal time: finer and more water", () => {
    const r = recommendNext(facts(28, "sour"))!;
    expect(r.grind).toBe("finer");
    expect(r.water).toBe("more");
  });

  it("balanced but fast: only the grind changes", () => {
    const r = recommendNext(facts(15, "balanced"))!;
    expect(r.grind).toBe("finer");
    expect(r.water).toBe("keep");
    expect(r.targetRatio).toBe(null);
    expect(r.text).toBe("Next shot: grind one step finer.");
  });

  it("balanced and on time: keep everything", () => {
    const r = recommendNext(facts(28, "balanced"))!;
    expect(r.grind).toBe("keep");
    expect(r.water).toBe("keep");
    expect(r.text).toContain("Keep your settings");
  });

  it("conflicting signals tell you to check puck prep instead of guessing", () => {
    for (const [time, taste] of [[15, "bitter"], [41, "sour"]] as const) {
      const r = recommendNext(facts(time, taste))!;
      expect(r.grind).toBe("check");
      expect(r.water).toBe("keep");
      expect(r.text).toContain("puck prep");
    }
  });

  it("keeps the target ratio inside the 1 to 4 spectrum", () => {
    expect(recommendNext(facts(41, "bitter", 1.1))!.targetRatio).toBe(1);
    expect(recommendNext(facts(15, "sour", 3.95))!.targetRatio).toBe(4);
  });
});
