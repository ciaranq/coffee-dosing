"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GrindTasteChart } from "@/components/GrindTasteChart";
import { CATEGORY_COPY } from "@/components/RatioSpectrum";
import { loadHistory, SAMPLE_LOGS, type ShotLog } from "@/lib/history";
import { cn } from "@/lib/utils";

const TASTE_LABEL = { sour: "Sour", balanced: "Balanced", bitter: "Bitter" } as const;

function when(iso: string) {
  return new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<ShotLog[] | null>(null);

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
  const balanced = shown.filter((l) => l.taste === "balanced").length;

  return (
    <main className="flex flex-1 flex-col gap-4 p-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">History</h1>
        <p className="mt-1 text-milk/70">
          {shown.length} {shown.length === 1 ? "shot" : "shots"}, {balanced} balanced.
        </p>
      </header>

      {showingSample && (
        <aside className="rounded-2xl border border-steam/40 bg-steam/10 p-4 text-sm" role="note">
          <p className="font-medium text-steam">Sample data</p>
          <p className="mt-1 text-milk/80">
            You have not saved a shot yet, so this is an example dial-in session.{" "}
            <Link href="/dial-in" className="font-medium text-milk underline underline-offset-4">
              Weigh your first shot
            </Link>
            .
          </p>
        </aside>
      )}

      <section className="glass rounded-3xl p-5" aria-labelledby="chart-title">
        <h2 id="chart-title" className="text-lg font-semibold">
          Grind against taste
        </h2>
        <p className="mb-3 text-sm text-milk/70">Find the grind settings that landed in Balanced.</p>
        <GrindTasteChart logs={shown} />
      </section>

      <section className="grid gap-2" aria-label="Shots">
        <h2 className="text-lg font-semibold">All shots</h2>
        {newestFirst.map((l) => (
          <article key={l.id} className="glass flex items-center justify-between gap-3 rounded-2xl p-4">
            <div className="min-w-0">
              <p className="tabular font-mono text-xl">1 : {l.ratio.toFixed(2)}</p>
              <p className="truncate text-sm text-milk/65">
                {CATEGORY_COPY[l.category].name} · {l.dose_g.toFixed(1)} g in, {l.yield_g.toFixed(1)} g out
              </p>
              <p className="text-xs text-milk/50">
                {when(l.created_at)}
                {l.grind_external !== null ? ` · grind ${l.grind_external}` : ""}
                {l.shot_time_s !== null ? ` · ${l.shot_time_s} s` : ""}
              </p>
            </div>
            {l.taste && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium",
                  l.taste === "sour" && "bg-steam/20 text-steam",
                  l.taste === "balanced" && "bg-crema/20 text-crema",
                  l.taste === "bitter" && "bg-ristretto/40 text-stone",
                )}
              >
                {TASTE_LABEL[l.taste]}
              </span>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
