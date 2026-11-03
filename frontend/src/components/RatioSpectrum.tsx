"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Category } from "@/lib/math";
import { categorize } from "@/lib/math";

// Scale runs 1 : 1 to 1 : 4. Zones are proportional: ristretto 1-1.5, normale 1.5-2.5, lungo 2.5-4.
const MIN = 1;
const MAX = 4;
const pct = (ratio: number) => ((Math.min(MAX, Math.max(MIN, ratio)) - MIN) / (MAX - MIN)) * 100;

const ZONES: { id: Category; label: string; from: number; to: number; color: string }[] = [
  { id: "ristretto", label: "Ristretto", from: 1, to: 1.5, color: "var(--color-ristretto)" },
  { id: "normale", label: "Normale", from: 1.5, to: 2.5, color: "var(--color-crema)" },
  { id: "lungo", label: "Lungo", from: 2.5, to: 4, color: "var(--color-steam)" },
];

export const CATEGORY_COPY: Record<Category, { name: string; blurb: string }> = {
  ristretto: { name: "Ristretto", blurb: "Concentrated, viscous, heavy body." },
  normale: { name: "Normale", blurb: "Balanced and sweet. The sweet spot for most medium and dark roasts." },
  lungo: { name: "Lungo", blurb: "Lighter body, higher extraction. Shows off acidity in light, fresh roasts." },
};

interface Props {
  /** null while there is not enough data to plot. */
  ratio: number | null;
}

/** The ratio plotted on the Ristretto, Normale, Lungo spectrum. The tube fills like liquid up to the ratio. */
export function RatioSpectrum({ ratio }: Props) {
  const reduce = useReducedMotion();
  const position = ratio === null ? 0 : pct(ratio);
  const category = ratio === null ? null : categorize(ratio);
  const fillColor = ZONES.find((z) => z.id === category)?.color ?? "rgba(255,255,255,0.2)";

  return (
    <div
      role="img"
      aria-label={
        ratio === null
          ? "Brew ratio spectrum, waiting for weights"
          : `Brew ratio 1 to ${ratio.toFixed(2)}, ${CATEGORY_COPY[category!].name}`
      }
    >
      <div className="relative h-5 w-full rounded-full bg-white/10 p-[3px]">
        {/* zone dividers */}
        <div className="absolute inset-y-0 left-0 w-full" aria-hidden="true">
          {[1.5, 2.5].map((edge) => (
            <span key={edge} className="absolute inset-y-1 w-px bg-white/25" style={{ left: `${pct(edge)}%` }} />
          ))}
        </div>
        <div className="relative h-full w-full overflow-hidden rounded-full">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: fillColor, backgroundImage: "linear-gradient(90deg, rgb(0 0 0 / 0.25), transparent 70%)" }}
            initial={false}
            animate={{ width: `${position}%` }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 16 }}
          />
        </div>
        {ratio !== null && (
          <motion.span
            aria-hidden="true"
            className="absolute top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-milk bg-espresso shadow-[0_0_18px_rgb(238_55_64_/_0.55)]"
            initial={false}
            animate={{ left: `${position}%` }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 16 }}
          />
        )}
      </div>

      <div className="relative mt-1 h-5 text-sm text-milk/70" aria-hidden="true">
        {ZONES.map((z) => {
          const left = pct(z.from);
          const width = pct(z.to) - left;
          return (
            <span
              key={z.id}
              className={`absolute whitespace-nowrap ${z.id === "ristretto" ? "text-left" : "text-center"} ${category === z.id ? "font-semibold text-milk" : ""}`}
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              {z.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
