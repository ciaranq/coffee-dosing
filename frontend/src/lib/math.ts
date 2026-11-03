// Shot math. Mirrors the Postgres generated columns in docs/contract/schema.sql.
// All arithmetic is done in integer hundredths of a gram so 0.1 + 0.2 style float
// drift can never change a category. Boundaries: docs/contract/ratio-cases.json.

export type Category = "ristretto" | "normale" | "lungo";

export interface ShotInput {
  pfEmpty: number;
  pfDry: number;
  cupEmpty: number;
  cupFull: number;
  pfWet?: number | null;
}

export interface ShotResult {
  dose: number;
  yield: number;
  /** 1 : ratio, rounded half-up to 3 decimals (same as the DB column). */
  ratio: number;
  retainedWater: number | null;
  category: Category;
}

export type ShotOutcome = { ok: true; result: ShotResult } | { ok: false; errors: string[] };

export const MAX_GRAMS = 5000;

const toHundredths = (g: number) => Math.round(g * 100);
const fromHundredths = (h: number) => h / 100;

/** Ratio below 1.5 is ristretto, below 2.5 normale, otherwise lungo (including > 4). */
export function categorize(ratio: number): Category {
  if (ratio < 1.5) return "ristretto";
  if (ratio < 2.5) return "normale";
  return "lungo";
}

/** Parse keypad text ("18", "18.", ".5") into grams. Null if empty, malformed, over 2 decimals or above 5000 g. */
export function parseGrams(text: string | undefined | null): number | null {
  if (!text || !/^\d*\.?\d{0,2}$/.test(text) || text === ".") return null;
  const grams = Number(text);
  return Number.isFinite(grams) && grams <= MAX_GRAMS ? grams : null;
}

export function computeShot(input: ShotInput): ShotOutcome {
  const pfEmpty = toHundredths(input.pfEmpty);
  const pfDry = toHundredths(input.pfDry);
  const cupEmpty = toHundredths(input.cupEmpty);
  const cupFull = toHundredths(input.cupFull);
  const pfWet = input.pfWet == null ? null : toHundredths(input.pfWet);

  const errors: string[] = [];
  if (pfDry <= pfEmpty) errors.push("Portafilter with coffee must weigh more than the empty portafilter.");
  if (cupFull <= cupEmpty) errors.push("Cup with espresso must weigh more than the empty cup.");
  if (pfWet !== null && pfWet < pfDry) errors.push("Wet portafilter cannot weigh less than the dry one.");
  if (errors.length) return { ok: false, errors };

  const dose = pfDry - pfEmpty;
  const yieldH = cupFull - cupEmpty;
  // round-half-up of (yield / dose) to 3 decimals using integers only
  const ratioMilli = Math.floor((2 * yieldH * 1000 + dose) / (2 * dose));
  const ratio = ratioMilli / 1000;

  return {
    ok: true,
    result: {
      dose: fromHundredths(dose),
      yield: fromHundredths(yieldH),
      ratio,
      retainedWater: pfWet === null ? null : fromHundredths(pfWet - pfDry),
      category: categorize(ratio),
    },
  };
}
