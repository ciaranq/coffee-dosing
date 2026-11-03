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
const H = 190;
const PAD = { l: 64, r: 14, t: 12, b: 34 };

export function GrindTasteChart({ logs }: { logs: ShotLog[] }) {
  const points = logs.filter((l) => l.taste && l.grind_external !== null) as (ShotLog & { taste: Taste; grind_external: number })[];

  if (points.length === 0) {
    return (
      <p className="rounded-2xl bg-white/5 p-4 text-sm text-milk/70">
        Log the grind setting and how the shot tasted to see the pattern here.
      </p>
    );
  }

  const xs = points.map((p) => p.grind_external);
  const min = Math.floor(Math.min(...xs)) - 1;
  const max = Math.ceil(Math.max(...xs)) + 1;
  const x = (v: number) => PAD.l + ((v - min) / (max - min)) * (W - PAD.l - PAD.r);
  const laneY = (taste: Taste) => PAD.t + (LANES.findIndex((l) => l.taste === taste) + 0.5) * ((H - PAD.t - PAD.b) / LANES.length);
  // a narrow range (e.g. one shot) would round several ticks to the same number, so de-duplicate
  const ticks = [...new Set(Array.from({ length: 5 }, (_, i) => Math.round(min + ((max - min) * i) / 4)))];

  const summary = points
    .map((p) => `grind ${p.grind_external}: ${p.taste}`)
    .join(", ");

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Grind setting against taste. ${summary}`} className="w-full">
        {LANES.map((lane) => (
          <g key={lane.taste}>
            <line x1={PAD.l} x2={W - PAD.r} y1={laneY(lane.taste)} y2={laneY(lane.taste)} stroke="white" strokeOpacity="0.12" />
            <text x={PAD.l - 10} y={laneY(lane.taste) + 4} textAnchor="end" fontSize="12" fill="white" fillOpacity="0.75">
              {lane.label}
            </text>
          </g>
        ))}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={PAD.t} y2={H - PAD.b} stroke="white" strokeOpacity="0.06" />
            <text x={x(t)} y={H - PAD.b + 16} textAnchor="middle" fontSize="11" fill="white" fillOpacity="0.6">
              {t}
            </text>
          </g>
        ))}
        <text x={(W + PAD.l - PAD.r) / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="white" fillOpacity="0.6">
          External grind setting
        </text>
        {points.map((p) => {
          const lane = LANES.find((l) => l.taste === p.taste)!;
          return (
            <circle key={p.id} cx={x(p.grind_external)} cy={laneY(p.taste)} r="7" fill={lane.color} fillOpacity="0.85" stroke="white" strokeOpacity="0.7">
              <title>{`Grind ${p.grind_external}, ${p.taste}, 1 : ${p.ratio.toFixed(2)}`}</title>
            </circle>
          );
        })}
      </svg>
    </figure>
  );
}
