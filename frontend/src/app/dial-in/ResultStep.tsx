"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, ChevronDown, Sparkles } from "lucide-react";
import { Keypad } from "@/components/Keypad";
import { CATEGORY_COPY, RatioSpectrum } from "@/components/RatioSpectrum";
import { shotFromDraft, type Action, type Draft, type TextField, type Taste } from "@/lib/draft";
import { addHistory, logFromDraft } from "@/lib/history";
import { insightsFor, recommendNext } from "@/lib/insights";
import { parseGrams } from "@/lib/math";
import { cn } from "@/lib/utils";
import { submitShot, type SubmitPayload } from "./actions";

const TASTES: { id: Taste; label: string; hint: string }[] = [
  { id: "sour", label: "Sour", hint: "Sharp, thin" },
  { id: "balanced", label: "Balanced", hint: "Sweet, rounded" },
  { id: "bitter", label: "Bitter", hint: "Harsh, dry" },
];

const FIELDS: { id: TextField; label: string; unit: string }[] = [
  { id: "shotTimeS", label: "Shot time", unit: "s" },
  { id: "grindExternal", label: "External grind", unit: "" },
  { id: "burrInternal", label: "Internal burr", unit: "" },
];

interface Props {
  draft: Draft;
  dispatch: (action: Action) => void;
  onBack: () => void;
  onSaved: () => void;
}

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; online: boolean }
  | { status: "error"; message: string };

const GRIND_BADGE: Record<"finer" | "coarser" | "keep" | "check", string> = {
  finer: "Grind Finer",
  coarser: "Grind Coarser",
  keep: "Hold Settings",
  check: "Check Puck Prep",
};

export function ResultStep({ draft, dispatch, onBack, onSaved }: Props) {
  const [field, setField] = useState<TextField>("shotTimeS");
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const reduce = useReducedMotion();

  const outcome = useMemo(() => shotFromDraft(draft), [draft]);
  const result = outcome && outcome.ok ? outcome.result : null;

  const insights = useMemo(
    () =>
      result
        ? insightsFor({
            ratio: result.ratio,
            category: result.category,
            shotTimeS: parseGrams(draft.shotTimeS),
            taste: draft.taste ?? null,
          })
        : [],
    [result, draft.shotTimeS, draft.taste],
  );

  const nextShot = useMemo(
    () =>
      result
        ? recommendNext({
            ratio: result.ratio,
            category: result.category,
            shotTimeS: parseGrams(draft.shotTimeS),
            taste: draft.taste ?? null,
          })
        : null,
    [result, draft.shotTimeS, draft.taste],
  );

  if (!result) {
    return (
      <section className="glass rounded-3xl p-6">
        <h1 className="text-2xl font-semibold">Some weights are missing</h1>
        <p className="mt-2 text-milk/70">Go back and check each step has a reading.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-5 h-14 w-full rounded-2xl bg-crema font-semibold text-espresso"
        >
          Back to the scale
        </button>
      </section>
    );
  }

  const copy = CATEGORY_COPY[result.category];

  async function onSave() {
    if (!result) return;
    setSave({ status: "saving" });
    const payload: SubmitPayload = {
      client_id: draft.clientId,
      portafilter_empty_g: parseGrams(draft.weights.pfEmpty)!,
      portafilter_dry_g: parseGrams(draft.weights.pfDry)!,
      cup_empty_g: parseGrams(draft.weights.cupEmpty)!,
      cup_full_g: parseGrams(draft.weights.cupFull)!,
      portafilter_wet_g: parseGrams(draft.weights.pfWet),
      shot_time_s: parseGrams(draft.shotTimeS),
      taste: draft.taste ?? null,
      grind_external: parseGrams(draft.grindExternal),
      burr_internal: parseGrams(draft.burrInternal),
    };
    let reply;
    try {
      reply = await submitShot(payload);
    } catch {
      reply = { ok: false as const, error: "Could not save the shot. Check your connection and try again." };
    }
    if (!reply.ok) {
      setSave({ status: "error", message: reply.error });
      return;
    }
    // Always keep a copy on this device so History works before the backend is live.
    const log = logFromDraft(draft);
    if (log) {
      try {
        addHistory(window.localStorage, log);
      } catch {
        /* storage blocked */
      }
    }
    setSave({ status: "saved", online: reply.persisted });
  }

  if (save.status === "saved") {
    return (
      <section className="glass rounded-3xl p-6" aria-live="polite">
        <motion.div
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          className="flex size-16 items-center justify-center rounded-2xl bg-crema text-espresso shadow-[0_8px_24px_-4px_rgb(238_55_64_/_0.6)]"
        >
          <Check className="size-8 stroke-[2.5]" aria-hidden="true" />
        </motion.div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Shot saved</h1>
        <p className="mt-1.5 text-sm text-milk/75">
          {save.online
            ? "Backed up to your cloud log and stored on this device."
            : "Saved on this device. Sign in to sync shots to your account."}
        </p>

        <dl className="glass-well mt-4 grid grid-cols-3 gap-2 rounded-2xl p-3.5 text-center">
          <div>
            <dt className="text-xs text-milk/60">Ratio</dt>
            <dd className="tabular mt-0.5 font-mono text-base font-semibold text-milk">1 : {result.ratio.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-xs text-milk/60">Dose → Yield</dt>
            <dd className="tabular mt-0.5 font-mono text-base font-semibold text-milk">
              {result.dose.toFixed(1)}→{result.yield.toFixed(1)}g
            </dd>
          </div>
          <div>
            <dt className="text-xs text-milk/60">Style</dt>
            <dd className="mt-0.5 text-base font-semibold text-crema">{copy.name}</dd>
          </div>
        </dl>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={onSaved}
            className="h-16 rounded-2xl bg-crema text-lg font-semibold text-espresso shadow-[0_8px_24px_-6px_rgb(238_55_64_/_0.55)] transition active:scale-[0.98]"
          >
            Dial in another shot
          </button>
          <Link
            href="/history"
            className="glass flex h-16 items-center justify-center rounded-2xl text-lg font-medium transition active:scale-[0.98]"
          >
            See history
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-crema/35 bg-crema/15 px-2.5 py-0.5 font-mono text-xs font-medium text-crema">
            {copy.range}
          </span>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">{copy.name}</h1>
          <p className="mt-0.5 max-w-[32ch] text-sm text-milk/70 [@media(max-height:720px)]:hidden">{copy.blurb}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to the scale"
          className="glass flex size-12 shrink-0 items-center justify-center rounded-2xl active:scale-95"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
      </header>

      <section className="glass rounded-3xl p-5" aria-label="Brew ratio">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-milk/70">Brew ratio</span>
          <span className="tabular font-mono text-4xl font-semibold tracking-tight" data-testid="ratio">
            1 : {result.ratio.toFixed(2)}
          </span>
        </div>
        <div className="mt-3.5">
          <RatioSpectrum ratio={result.ratio} />
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ["Dose", `${result.dose.toFixed(1)} g`],
            ["Yield", `${result.yield.toFixed(1)} g`],
            ["Retained", result.retainedWater === null ? "-" : `${result.retainedWater.toFixed(1)} g`],
          ].map(([label, value]) => (
            <div key={label} className="glass-well rounded-2xl py-2.5">
              <dt className="text-xs text-milk/60">{label}</dt>
              <dd className="tabular mt-0.5 font-mono text-lg font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="glass rounded-3xl p-4" aria-label="How did it taste">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">How did it taste?</h2>
          <span className="text-xs text-milk/55">Tap to diagnose</span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Taste">
          {TASTES.map((t) => {
            const active = draft.taste === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => dispatch({ type: "taste", taste: active ? undefined : t.id })}
                className={cn(
                  "flex h-16 flex-col items-center justify-center rounded-2xl border text-lg font-semibold transition active:scale-95",
                  active
                    ? "border-crema bg-crema text-espresso shadow-[0_8px_20px_-6px_rgb(238_55_64_/_0.6)]"
                    : "border-white/15 bg-white/5 text-milk hover:border-white/25",
                )}
              >
                {t.label}
                <span className={cn("mt-0.5 text-xs font-normal", active ? "text-espresso/75" : "text-milk/55")}>
                  {t.hint}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Hero takeaway: placed directly below Taste so the user sees what to do next immediately */}
      {nextShot ? (
        <section
          className="relative overflow-hidden rounded-3xl border-2 border-crema/70 bg-gradient-to-br from-crema/20 via-crema/10 to-transparent p-5 shadow-[0_14px_34px_-12px_rgb(238_55_64_/_0.35)]"
          aria-label="Try next"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-crema">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Try next
            </span>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-crema px-2.5 py-0.5 font-mono text-xs font-semibold text-espresso">
                {GRIND_BADGE[nextShot.grind]}
              </span>
              {nextShot.targetRatio !== null && (
                <span className="tabular rounded-full border border-steam/40 bg-black/40 px-2.5 py-0.5 font-mono text-xs font-medium text-steam">
                  Aim 1 : {nextShot.targetRatio.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <p className="mt-2.5 text-lg font-medium leading-snug text-milk" data-testid="try-next">
            {nextShot.text}
          </p>
        </section>
      ) : (
        <section className="glass-well rounded-3xl p-4 text-center text-sm text-milk/65" aria-live="polite">
          Tap how the shot tasted above (or enter shot time below) to get your next-shot dial-in adjustment.
        </section>
      )}

      <section className="glass rounded-3xl p-5" aria-label="Shot details">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Grinder and timing</h2>
          <span className="text-xs text-milk/55">Optional</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2" role="tablist" aria-label="Field to edit">
          {FIELDS.map((f) => {
            const active = field === f.id;
            const v = draft[f.id];
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setField(f.id)}
                className={cn(
                  "flex h-20 flex-col items-center justify-center rounded-2xl border px-1 transition active:scale-95",
                  active
                    ? "border-steam bg-steam/15 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.2)]"
                    : "border-white/15 bg-white/5",
                )}
              >
                <span className="text-xs text-milk/65">{f.label}</span>
                <span className="tabular mt-0.5 font-mono text-xl font-medium">
                  {v || "-"}
                  {v && f.unit ? <span className="text-sm text-milk/60"> {f.unit}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <Keypad onKey={(key) => dispatch({ type: "key", field, key })} />
        </div>
      </section>

      {insights.length > 0 && (
        <section className="grid gap-2.5" aria-label="Why it tasted this way">
          <h2 className="text-lg font-semibold">Why it tasted this way</h2>
          {insights.map((i) => (
            <details key={i.id} className="glass group rounded-2xl p-4" open={i.tips.length > 0 && insights.length === 1}>
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-base font-medium marker:content-['']">
                <div>
                  <span>{i.title}</span>
                  <span className="mt-1 block text-sm font-normal text-milk/70">{i.body}</span>
                </div>
                {i.tips.length > 0 && (
                  <ChevronDown
                    className="mt-1 size-4 shrink-0 text-milk/60 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                )}
              </summary>
              {i.tips.length > 0 && (
                <ul className="mt-3 list-disc space-y-1.5 border-t border-white/10 pt-3 pl-5 text-sm text-milk/80">
                  {i.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              )}
            </details>
          ))}
        </section>
      )}

      {/* pinned to the bottom of the scrolling area so Save is always one tap away */}
      <div className="sticky bottom-0 -mx-4 -mb-4 mt-2 bg-gradient-to-t from-espresso via-espresso/95 to-transparent px-4 pb-2 pt-2">
        {save.status === "error" && (
          <p role="alert" className="mb-3 text-center text-sm text-red-tint">
            {save.message}
          </p>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={save.status === "saving"}
          className="h-14 w-full rounded-2xl bg-crema text-lg font-semibold text-espresso shadow-[0_8px_24px_-6px_rgb(238_55_64_/_0.55)] transition active:scale-[0.98] disabled:opacity-60"
        >
          {save.status === "saving" ? "Saving..." : "Save shot"}
        </button>
      </div>
    </>
  );
}
