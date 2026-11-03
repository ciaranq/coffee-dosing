"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GrindTasteChart } from "@/components/GrindTasteChart";
import { CATEGORY_COPY } from "@/components/RatioSpectrum";
import type { Taste } from "@/lib/draft";
import { loadHistory, SAMPLE_LOGS, type ShotLog } from "@/lib/history";
import { cn } from "@/lib/utils";

const TASTE_LABEL = { sour: "Sour", balanced: "Balanced", bitter: "Bitter" } as const;
type Filter = "all" | Taste;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "balanced", label: "Balanced" },
  { id: "sour", label: "Sour" },
  { id: "bitter", label: "Bitter" },
];

function when(iso: string) {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<ShotLog[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let own: ShotLog[] = [];
    try {
      own = loadHistory(window.localStorage);
    } catch {
      /* storage blocked */
    }
    setLogs(own);
  }, []);

  if (logs === null) return <main className="flex-1 p-5" aria-busy="true" />;

  // Until Neon and sign-in are live, show a sample session so the charts are not empty.
  const showingSample = logs.length === 0;
  const shown = showingSample ? SAMPLE_LOGS : logs;
  const newestFirst = [...shown].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const filtered = filter === "all" ? newestFirst : newestFirst.filter((l) => l.taste === filter);
  const balancedCount = shown.filter((l) => l.taste === "balanced").length;
  const avgRatio = shown.length > 0 ? shown.reduce((acc, l) => acc + l.ratio, 0) / shown.length : 0;

  return (
    <main className="flex flex-1 flex-col gap-4 p-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">History</h1>
          <p className="mt-1 text-sm text-milk/70">
            {shown.length} {shown.length === 1 ? "shot" : "shots"} · {balancedCount} balanced
          </p>
        </div>
        {shown.length > 0 && (
          <div className="glass-well rounded-2xl px-3.5 py-2 text-right">
            <span className="block text-[0.65rem] uppercase tracking-wider text-milk/55">Avg ratio</span>
            <span className="tabular font-mono text-base font-semibold text-milk">1 : {avgRatio.toFixed(2)}</span>
          </div>
        )}
      </header>

      {showingSample && (
        <aside className="rounded-2xl border border-steam/35 bg-steam/10 p-4 text-sm" role="note">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-steam">Sample dial-in session</p>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-xs text-milk/75">Demo</span>
          </div>
          <p className="mt-1 text-milk/80">
            You have not saved a shot yet, so this is an example dial-in session.{" "}
            <Link href="/dial-in" className="font-semibold text-milk underline decoration-crema underline-offset-4">
              Weigh your first shot
            </Link>
            .
          </p>
        </aside>
      )}

      <section className="glass rounded-3xl p-5" aria-labelledby="chart-title">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <div>
            <h2 id="chart-title" className="text-lg font-semibold">
              Grind against taste
            </h2>
            <p className="text-sm text-milk/70">Find the grind settings that landed in the Balanced zone.</p>
          </div>
        </div>
        <GrindTasteChart logs={shown} />
      </section>

      <section className="grid gap-3" aria-label="Shots">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">All shots</h2>
          <div className="flex gap-1.5" role="group" aria-label="Filter shots by taste">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "min-h-9 rounded-full px-3 py-1 text-xs font-semibold transition active:scale-95",
                    active ? "bg-crema text-espresso" : "glass text-milk/75 hover:text-milk",
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="glass rounded-2xl p-6 text-center text-sm text-milk/65">No shots match this taste filter yet.</p>
        ) : (
          filtered.map((l) => (
            <article key={l.id} className="glass flex flex-col gap-2.5 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-baseline gap-2.5">
                  <p className="tabular font-mono text-2xl font-semibold text-milk">1 : {l.ratio.toFixed(2)}</p>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-milk/85">
                    {CATEGORY_COPY[l.category].name}
                  </span>
                </div>
                {l.taste && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                      l.taste === "sour" && "bg-steam/20 text-steam",
                      l.taste === "balanced" && "bg-crema text-espresso",
                      l.taste === "bitter" && "bg-ristretto/50 text-stone",
                    )}
                  >
                    {TASTE_LABEL[l.taste]}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-xs text-milk/70">
                <div className="flex flex-wrap items-center gap-2 font-mono">
                  <span className="tabular text-milk">
                    {l.dose_g.toFixed(1)}g → {l.yield_g.toFixed(1)}g
                  </span>
                  {l.grind_external !== null && (
                    <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-milk/80">Grind {l.grind_external}</span>
                  )}
                  {l.shot_time_s !== null && (
                    <span className="tabular rounded-md bg-white/5 px-1.5 py-0.5 text-milk/80">{l.shot_time_s}s</span>
                  )}
                  {l.retained_water_g !== null && (
                    <span className="tabular rounded-md bg-white/5 px-1.5 py-0.5 text-milk/65">
                      +{l.retained_water_g.toFixed(1)}g wet
                    </span>
                  )}
                </div>
                <span className="text-[0.7rem] text-milk/50">{when(l.created_at)}</span>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
