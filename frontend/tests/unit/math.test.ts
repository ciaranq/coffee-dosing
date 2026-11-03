import { describe, expect, it } from "bun:test";
import cases from "../../../docs/contract/ratio-cases.json";
import { categorize, computeShot, parseGrams, type Category } from "../../src/lib/math";

type Raw = {
  portafilter_empty_g: number;
  portafilter_dry_g: number;
  cup_empty_g: number;
  cup_full_g: number;
  portafilter_wet_g?: number | null;
};

const toInput = (c: Raw) => ({
  pfEmpty: c.portafilter_empty_g,
  pfDry: c.portafilter_dry_g,
  cupEmpty: c.cup_empty_g,
  cupFull: c.cup_full_g,
  pfWet: c.portafilter_wet_g ?? null,
});

describe("computeShot: shared contract cases", () => {
  for (const c of cases.cases) {
    it(c.name, () => {
      const r = computeShot(toInput(c));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.result.dose).toBe(c.dose_g);
      expect(r.result.yield).toBe(c.yield_g);
      expect(r.result.ratio).toBe(c.ratio);
      expect(r.result.retainedWater).toBe(c.retained_water_g);
      expect(r.result.category).toBe(c.category as Category);
    });
  }

  for (const c of cases.invalid) {
    it(`rejects: ${c.name}`, () => {
      const r = computeShot(toInput(c as Raw));
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.errors.length).toBeGreaterThan(0);
    });
  }
});

describe("categorize", () => {
  it("uses lower-inclusive, upper-exclusive boundaries", () => {
    expect(categorize(0.9)).toBe("ristretto");
    expect(categorize(1.499)).toBe("ristretto");
    expect(categorize(1.5)).toBe("normale");
    expect(categorize(2.499)).toBe("normale");
    expect(categorize(2.5)).toBe("lungo");
    expect(categorize(4)).toBe("lungo");
    expect(categorize(5)).toBe("lungo");
  });
});

describe("computeShot: precision", () => {
  it("avoids float drift (0.1 + 0.2 style sums)", () => {
    const r = computeShot({ pfEmpty: 200.1, pfDry: 218.3, cupEmpty: 100.1, cupFull: 136.2, pfWet: null });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.dose).toBe(18.2);
    expect(r.result.yield).toBe(36.1);
  });

  it("rounds ratio half-up to 3 decimals before categorising", () => {
    // 26.9995 is not representable in 2dp input; use dose 3.00, yield 4.50 -> 1.5 exactly
    const r = computeShot({ pfEmpty: 100, pfDry: 103, cupEmpty: 50, cupFull: 54.5, pfWet: null });
    expect(r.ok && r.result.ratio).toBe(1.5);
    expect(r.ok && r.result.category).toBe("normale");
  });

  it("returns null retained water when wet weight is missing", () => {
    const r = computeShot({ pfEmpty: 200, pfDry: 218, cupEmpty: 100, cupFull: 136, pfWet: null });
    expect(r.ok && r.result.retainedWater).toBe(null);
  });
});

describe("parseGrams", () => {
  it("parses keypad strings", () => {
    expect(parseGrams("18")).toBe(18);
    expect(parseGrams("18.")).toBe(18);
    expect(parseGrams("18.5")).toBe(18.5);
    expect(parseGrams(".5")).toBe(0.5);
    expect(parseGrams("412.30")).toBe(412.3);
  });
  it("returns null for empty, malformed or over-precise input", () => {
    expect(parseGrams("")).toBe(null);
    expect(parseGrams(".")).toBe(null);
    expect(parseGrams("1.234")).toBe(null);
    expect(parseGrams("1..2")).toBe(null);
    expect(parseGrams("abc")).toBe(null);
    expect(parseGrams(undefined)).toBe(null);
  });
  it("rejects values above the 5000 g contract limit", () => {
    expect(parseGrams("5000")).toBe(5000);
    expect(parseGrams("5000.01")).toBe(null);
  });
});
