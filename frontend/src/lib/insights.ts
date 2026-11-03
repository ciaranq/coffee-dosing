// Educational insights: why a shot pulled fast or slow, and what to change on the grinder next.
// General espresso guidance, not a measurement: phrased as likely causes.

import type { Taste } from "./draft";
import type { Category } from "./math";

export interface ShotFacts {
  ratio: number;
  category: Category;
  shotTimeS: number | null;
  taste: Taste | null;
}

export interface Insight {
  id: string;
  title: string;
  body: string;
  tips: string[];
}

export const FAST_BELOW_S = 22;
export const SLOW_ABOVE_S = 35;

export interface NextShot {
  /** "check" means the signals conflict: fix puck prep before touching the grinder. */
  grind: "finer" | "coarser" | "keep" | "check";
  water: "more" | "less" | "keep";
  /** Suggested 1 : x for the next shot, or null when the ratio should stay put. */
  targetRatio: number | null;
  text: string;
}

const RATIO_STEP = 0.2;
const clampRatio = (r: number) => Math.min(4, Math.max(1, Math.round(r * 10) / 10));

/**
 * One plain instruction for the next shot: which way to move the grind and whether to put more or less water
 * in the cup. Time and taste must agree before the grinder moves; if they conflict we say so instead of guessing.
 */
export function recommendNext(facts: ShotFacts): NextShot | null {
  const { shotTimeS, taste, ratio } = facts;
  const byTime = shotTimeS === null ? null : shotTimeS < FAST_BELOW_S ? "finer" : shotTimeS > SLOW_ABOVE_S ? "coarser" : null;
  const byTaste = taste === "sour" ? "finer" : taste === "bitter" ? "coarser" : null;

  if (byTime === null && taste === null && shotTimeS === null) return null;

  if (byTime && byTaste && byTime !== byTaste) {
    return {
      grind: "check",
      water: "keep",
      targetRatio: null,
      text: "Mixed signals: the shot time and the taste disagree. Check your puck prep (even distribution, level tamp) before changing the grind.",
    };
  }

  const grind = byTime ?? byTaste;
  const water = taste === "sour" ? "more" : taste === "bitter" ? "less" : "keep";

  if (!grind && water === "keep") {
    return { grind: "keep", water: "keep", targetRatio: null, text: "Keep your settings. Change one thing at a time from here." };
  }

  const targetRatio = water === "keep" ? null : clampRatio(ratio + (water === "more" ? RATIO_STEP : -RATIO_STEP));
  const parts: string[] = [];
  if (grind) parts.push(`grind one step ${grind}`);
  if (water === "more") parts.push(`let the shot run longer (aim for about 1 : ${targetRatio!.toFixed(1)})`);
  if (water === "less") parts.push(`stop the shot sooner (aim for about 1 : ${targetRatio!.toFixed(1)})`);

  return { grind: grind ?? "keep", water, targetRatio, text: `Next shot: ${parts.join(" and ")}.` };
}

export function insightsFor(facts: ShotFacts): Insight[] {
  const out: Insight[] = [];
  const { shotTimeS, taste, category } = facts;

  if (shotTimeS !== null && shotTimeS < FAST_BELOW_S) {
    out.push({
      id: "fast",
      title: `Pulled fast (${shotTimeS} s)`,
      body: "Water ran through the puck with little resistance, so it likely under-extracted.",
      tips: [
        "Grind finer by one step. This is the first thing to change.",
        "Check for channelling: an uneven puck lets water race through one path. Distribute the grounds and tamp level.",
        "Stale or very coarse-roasted beans flow faster. Check the roast date.",
        "A light tamp or a dose that is too low for the basket also speeds the shot.",
      ],
    });
  }

  if (shotTimeS !== null && shotTimeS > SLOW_ABOVE_S) {
    out.push({
      id: "slow",
      title: `Pulled slow (${shotTimeS} s)`,
      body: "The puck held the water back for long, so it likely over-extracted.",
      tips: [
        "Grind coarser by one step.",
        "Check the dose: too much coffee for the basket chokes the flow.",
        "A very fresh roast releases gas that can slow the shot. Rest beans a few days after roasting.",
        "Tamp level and with even pressure. A tilted tamp causes uneven flow.",
      ],
    });
  }

  if (taste === "sour") {
    out.push({
      id: "sour",
      title: "Tastes sour",
      body: "Sour usually means under-extraction: not enough was dissolved from the grounds.",
      tips: ["Grind finer.", "Let the shot run longer, aiming for a higher ratio.", "Use hotter water if your machine allows it."],
    });
  }

  if (taste === "bitter") {
    out.push({
      id: "bitter",
      title: "Tastes bitter",
      body: "Bitter usually means over-extraction: too much was pulled from the grounds.",
      tips: ["Grind coarser.", "Stop the shot sooner, aiming for a lower ratio.", "Check the water is not too hot."],
    });
  }

  if (taste === "balanced") {
    out.push({
      id: "balanced",
      title: "Balanced shot",
      body: "Sweet, with acidity and bitterness in check. Write the grind settings down, then change one thing at a time.",
      tips: [],
    });
  }

  if (category === "ristretto" && taste !== "balanced") {
    out.push({
      id: "ristretto-note",
      title: "Short ratio",
      body: "Ristretto is concentrated with a heavy body. If it is harsh, let the shot run longer.",
      tips: [],
    });
  }
  if (category === "lungo" && taste !== "balanced") {
    out.push({
      id: "lungo-note",
      title: "Long ratio",
      body: "Lungo is lighter in body and highlights acidity. If it tastes thin, stop the shot sooner.",
      tips: [],
    });
  }

  return out;
}
