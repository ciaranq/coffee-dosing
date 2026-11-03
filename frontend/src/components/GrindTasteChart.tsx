import type { Taste } from "@/lib/draft";
import type { ShotLog } from "@/lib/history";

// Grind setting (x) against how the shot tasted (lanes). Reads left to right as "finer -> coarser" when the
// grinder's scale counts up with coarseness; the lanes make the balanced band easy to find.

const LANES: { taste: Taste; label: string; color: string }[] = [
  { taste: "sour", label: "Sour", color: "var(--color-steam)" },
  { taste: "balanced", label: "Balanced", color: "var(--color-crema)" },
  { taste: "bitter", label: "Bitter", color: "var(--color-ristretto)" },
];

const W = 340;
const H = 196;
const PAD = { l: 68, r: 16, t: 14, b: 36 };

export function GrindTasteChart({ logs }: { logs: ShotLog[] }) {
  const points = logs.filter((l) => l.taste && l.grind_external !== null) as (ShotLog & {
    taste: Taste;
    grind_external: number;
  })[];

  if (points.length === 0) {
    return (
      <p className="glass-well rounded-2xl p-4 text-sm text-milk/70">
        Log the grind setting and how the shot tasted to see the pattern here.
      </p>
    );
  }

  const xs = points.map((p) => p.grind_external);
  const min = Math.floor(Math.min(...xs)) - 1;
  const max = Math.ceil(Math.max(...xs)) + 1;
  const x = (v: number) => PAD.l + ((v - min) / (max - min)) * (W - PAD.l - PAD.r);
  const laneHeight = (H - PAD.t - PAD.b) / LANES.length;
  const laneY = (taste: Taste) => PAD.t + (LANES.findIndex((l) => l.taste === taste) + 0.5) * laneHeight;

  // Compute sweet-spot range from balanced shots when present
  const balancedXs = points.filter((p) => p.taste === "balanced").map((p) => p.grind_external);
  const sweetMin = balancedXs.length > 0 ? Math.min(...balancedXs) - 0.35 : null;
  const sweetMax = balancedXs.length > 0 ? Math.max(...balancedXs) + 0.35 : null;

  // Group identical (grind_external, taste) coordinates so overlapping shots show a count ring
  const grouped = new Map<string, { point: (typeof points)[number]; count: number }>();
  for (const p of points) {
    const k = `${p.grind_external}:${p.taste}`;
    const existing = grouped.get(k);
    if (existing) existing.count += 1;
    else grouped.set(k, { point: p, count: 1 });
  }

  const ticks = [...new Set(Array.from({ length: 5 }, (_, i) => Math.round(min + ((max - min) * i) / 4)))];
  const summary = points.map((p) => `grind ${p.grind_external}: ${p.taste}`).join(", ");
  const balancedLaneY = laneY("balanced");

  return (
    <figure className="glass-well rounded-2xl p-3">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Grind setting against taste. ${summary}`} className="w-full">
        {/* Highlighted Balanced horizontal target band */}
        <rect
          x={PAD.l}
          y={balancedLaneY - laneHeight * 0.42}
          width={W - PAD.l - PAD.r}
          height={laneHeight * 0.84}
          rx={8}
          fill="var(--color-crema)"
          fillOpacity="0.10"
        />

        {/* Vertical sweet-spot grind zone */}
        {sweetMin !== null && sweetMax !== null && (
          <rect
            x={x(sweetMin)}
            y={PAD.t}
            width={Math.max(12, x(sweetMax) - x(sweetMin))}
            height={H - PAD.t - PAD.b}
            rx={6}
            fill="var(--color-crema)"
            fillOpacity="0.08"
            stroke="var(--color-crema)"
            strokeOpacity="0.25"
            strokeDasharray="3 3"
          />
        )}

        {LANES.map((lane) => {
          const isBalanced = lane.taste === "balanced";
          return (
            <g key={lane.taste}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={laneY(lane.taste)}
                y2={laneY(lane.taste)}
                stroke={isBalanced ? "var(--color-crema)" : "white"}
                strokeOpacity={isBalanced ? "0.35" : "0.12"}
                strokeDasharray={isBalanced ? undefined : "2 3"}
              />
              <text
                x={PAD.l - 10}
                y={laneY(lane.taste) + 4}
                textAnchor="end"
                fontSize="12"
                fontWeight={isBalanced ? "600" : "400"}
                fill={isBalanced ? "var(--color-milk)" : "white"}
                fillOpacity={isBalanced ? "0.95" : "0.7"}
              >
                {lane.label}
              </text>
            </g>
          );
        })}

        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={PAD.t} y2={H - PAD.b} stroke="white" strokeOpacity="0.06" />
            <text x={x(t)} y={H - PAD.b + 16} textAnchor="middle" fontSize="11" fill="white" fillOpacity="0.65">
              {t}
            </text>
          </g>
        ))}

        <text x={(W + PAD.l - PAD.r) / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="white" fillOpacity="0.55">
          ← Finer · External grind setting · Coarser →
        </text>

        {[...grouped.values()].map(({ point: p, count }) => {
          const lane = LANES.find((l) => l.taste === p.taste)!;
          const cx = x(p.grind_external);
          const cy = laneY(p.taste);
          return (
            <g key={p.id}>
              {count > 1 && (
                <circle cx={cx} cy={cy} r="12" fill={lane.color} fillOpacity="0.22" stroke={lane.color} strokeOpacity="0.5" />
              )}
              <circle cx={cx} cy={cy} r="7.5" fill={lane.color} fillOpacity="0.92" stroke="#111111" strokeWidth="1.5">
                <title>{`Grind ${p.grind_external}, ${p.taste}, 1 : ${p.ratio.toFixed(2)}${count > 1 ? ` (${count} shots)` : ""}`}</title>
              </circle>
              <circle cx={cx} cy={cy} r="7.5" fill="none" stroke="white" strokeOpacity="0.75" strokeWidth="1" />
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
