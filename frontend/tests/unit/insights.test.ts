import { describe, expect, it } from "bun:test";
import { insightsFor } from "../../src/lib/insights";

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
