"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Keypad } from "@/components/Keypad";
import { CATEGORY_COPY, RatioSpectrum } from "@/components/RatioSpectrum";
import { shotFromDraft, type Action, type Draft, type TextField, type Taste } from "@/lib/draft";
import { addHistory, logFromDraft } from "@/lib/history";
import { insightsFor } from "@/lib/insights";
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

export function ResultStep({ draft, dispatch, onBack, onSaved }: Props) {
  const [field, setField] = useState<TextField>("shotTimeS");
  const [save, setSave] = useState<SaveState>({ status: "idle" });

  const outcome = useMemo(() => shotFromDraft(draft), [draft]);
  const result = outcome && outcome.ok ? outcome.result : null;

  const insights = useMemo(
    () =>
      result
        ? insightsFor({ ratio: result.ratio, category: result.category, shotTimeS: parseGrams(draft.shotTimeS), taste: draft.taste ?? null })
        : [],
    [result, draft.shotTimeS, draft.taste],
  );

  if (!result) {
    return (
      <section className="glass rounded-3xl p-6">
        <h1 className="text-2xl font-semibold">Some weights are missing</h1>
        <p className="mt-2 text-milk/70">Go back and check each step has a reading.</p>
        <button type="button" onClick={onBack} className="mt-5 h-14 w-full rounded-2xl bg-crema font-semibold text-espresso">
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
        <div className="flex size-14 items-center justify-center rounded-full bg-crema text-espresso">
          <Check className="size-7" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-3xl font-semibold">Shot saved</h1>
        <p className="mt-2 text-milk/70">
          1 : {result.ratio.toFixed(2)} · {copy.name}.{" "}
          {save.online ? "It is backed up to your account." : "It is saved on this device only. Sign in to back your shots up to your account."}
        </p>
        <div className="mt-6 grid gap-3">
          <button type="button" onClick={onSaved} className="h-16 rounded-2xl bg-crema text-lg font-semibold text-espresso active:scale-[0.98]">
            Dial in another shot
          </button>
          <Link href="/history" className="glass flex h-16 items-center justify-center rounded-2xl text-lg font-medium active:scale-[0.98]">
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
          <p className="text-sm text-milk/60">Your shot</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{copy.name}</h1>
          <p className="mt-1 max-w-[30ch] text-milk/70">{copy.blurb}</p>
        </div>
        <button type="button" onClick={onBack} aria-label="Back to the scale" className="glass flex size-12 shrink-0 items-center justify-center rounded-2xl active:scale-95">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
      </header>

      <section className="glass rounded-3xl p-5" aria-label="Brew ratio">
        <div className="flex items-baseline justify-between">
          <span className="text-milk/70">Brew ratio</span>
          <span className="tabular font-mono text-4xl font-semibold" data-testid="ratio">
            1 : {result.ratio.toFixed(2)}
          </span>
        </div>
        <div className="mt-4">
          <RatioSpectrum ratio={result.ratio} />
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          {[
            ["Dose", `${result.dose.toFixed(1)} g`],
            ["Yield", `${result.yield.toFixed(1)} g`],
            ["Retained", result.retainedWater === null ? "-" : `${result.retainedWater.toFixed(1)} g`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white/5 py-3">
              <dt className="text-sm text-milk/60">{label}</dt>
              <dd className="tabular mt-0.5 font-mono text-lg">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="glass rounded-3xl p-5" aria-label="How did it taste">
        <h2 className="text-lg font-semibold">How did it taste?</h2>
        <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Taste">
          {TASTES.map((t) => {
            const active = draft.taste === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => dispatch({ type: "taste", taste: active ? undefined : t.id })}
                className={cn(
                  "flex h-20 flex-col items-center justify-center rounded-2xl border text-lg font-medium transition active:scale-95",
                  active ? "border-crema bg-crema text-espresso" : "border-white/15 bg-white/5",
                )}
              >
                {t.label}
                <span className={cn("text-xs font-normal", active ? "text-espresso/70" : "text-milk/55")}>{t.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass rounded-3xl p-5" aria-label="Shot details">
        <h2 className="text-lg font-semibold">Grinder and timing</h2>
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
                  active ? "border-steam bg-steam/15" : "border-white/15 bg-white/5",
                )}
              >
                <span className="text-xs text-milk/65">{f.label}</span>
                <span className="tabular font-mono text-xl">
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
        <section className="grid gap-2" aria-label="Why it tasted this way">
          <h2 className="text-lg font-semibold">What to change next</h2>
          {insights.map((i) => (
            <details key={i.id} className="glass group rounded-2xl p-4" open={i.tips.length > 0 && insights.length === 1}>
              <summary className="cursor-pointer list-none text-base font-medium marker:content-['']">
                {i.title}
                <span className="mt-1 block text-sm font-normal text-milk/70">{i.body}</span>
              </summary>
              {i.tips.length > 0 && (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-milk/80">
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
      <div className="sticky bottom-0 -mx-4 -mb-4 mt-2 bg-gradient-to-t from-espresso via-espresso/95 to-transparent px-4 pb-3 pt-6">
        {save.status === "error" && (
          <p role="alert" className="mb-3 text-center text-sm text-ristretto">
            {save.message}
          </p>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={save.status === "saving"}
          className="h-16 w-full rounded-2xl bg-crema text-lg font-semibold text-espresso transition active:scale-[0.98] disabled:opacity-60"
        >
          {save.status === "saving" ? "Saving..." : "Save shot"}
        </button>
      </div>
    </>
  );
}
