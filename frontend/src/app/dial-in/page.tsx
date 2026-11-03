"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Keypad } from "@/components/Keypad";
import { RatioSpectrum } from "@/components/RatioSpectrum";
import { STEP_WEIGHT, canAdvance, shotFromDraft, stepError } from "@/lib/draft";
import { computeShot, parseGrams } from "@/lib/math";
import { useDialInDraft } from "@/lib/useDialInDraft";
import { cn } from "@/lib/utils";
import { ResultStep } from "./ResultStep";

const STEPS: Record<1 | 2 | 3 | 4 | 5, { title: string; prompt: string }> = {
  1: { title: "Empty portafilter", prompt: "Put the empty portafilter on the scale." },
  2: { title: "Portafilter with coffee", prompt: "Add your ground coffee, then weigh the portafilter again." },
  3: { title: "Empty cup", prompt: "Put your empty cup on the scale." },
  4: { title: "Cup with espresso", prompt: "Pull the shot into the cup, then weigh it." },
  5: { title: "Wet portafilter", prompt: "Weigh the portafilter straight after the shot, with the used puck still in it. Skip this if you like." },
};

function Waiting() {
  return (
    <span className="inline-flex items-center gap-2 text-steam">
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-steam opacity-70" />
        <span className="relative inline-flex size-2.5 rounded-full bg-steam" />
      </span>
      Waiting for the scale
    </span>
  );
}

export default function DialInPage() {
  const { draft, hydrated, stale, dispatch, resume, discard, finish } = useDialInDraft();
  const reduce = useReducedMotion();
  const step = draft.step;

  // Keep ?step= in the URL so the back button walks the wizard. The draft stays the source of truth.
  useEffect(() => {
    if (!hydrated) return;
    const current = Number(new URLSearchParams(window.location.search).get("step"));
    if (current === step) return;
    const url = `${window.location.pathname}?step=${step}`;
    if (current) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, [hydrated, step]);

  useEffect(() => {
    const onPop = () => {
      const target = Number(new URLSearchParams(window.location.search).get("step"));
      if (target) dispatch({ type: "goTo", step: target });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [dispatch]);

  const liveShot = useMemo(() => {
    const outcome = shotFromDraft(draft);
    return outcome && outcome.ok ? outcome.result : null;
  }, [draft]);

  if (!hydrated) {
    return <main className="flex-1 p-4" aria-busy="true" />;
  }

  if (stale) {
    return (
      <main className="flex flex-1 flex-col justify-center gap-4 p-4">
        <section className="glass rounded-3xl p-6">
          <h1 className="text-2xl font-semibold">Pick up where you left off?</h1>
          <p className="mt-2 text-milk/70">You have a shot in progress from more than 12 hours ago.</p>
          <div className="mt-6 grid gap-3">
            <button type="button" onClick={resume} className="h-16 rounded-2xl bg-crema text-lg font-semibold text-espresso active:scale-[0.98]">
              Resume shot
            </button>
            <button type="button" onClick={discard} className="glass h-16 rounded-2xl text-lg font-medium active:scale-[0.98]">
              Start a new shot
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (step === 6) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4">
        <ResultStep draft={draft} dispatch={dispatch} onBack={() => dispatch({ type: "back" })} onSaved={finish} />
      </main>
    );
  }

  const config = STEPS[step];
  const field = STEP_WEIGHT[step];
  const value = draft.weights[field] ?? "";
  const error = value ? stepError(draft) : null;
  const pfEmpty = parseGrams(draft.weights.pfEmpty);
  const pfDry = parseGrams(draft.weights.pfDry);
  const dose = pfEmpty !== null && pfDry !== null ? Math.round((pfDry - pfEmpty) * 100) / 100 : null;

  // live ratio preview while the cup is on the scale (step 4), using whatever is typed so far
  const preview = (() => {
    if (step < 4) return null;
    const cupEmpty = parseGrams(draft.weights.cupEmpty);
    const cupFull = parseGrams(draft.weights.cupFull);
    if (pfEmpty === null || pfDry === null || cupEmpty === null || cupFull === null) return null;
    const outcome = computeShot({ pfEmpty, pfDry, cupEmpty, cupFull });
    return outcome.ok ? outcome.result : null;
  })();
  const ratio = step >= 5 ? (liveShot?.ratio ?? null) : (preview?.ratio ?? null);
  const showRatio = step >= 4;
  const optional = step === 5;
  const skipping = optional && !value;

  // one line of context under the reading
  let info: React.ReactNode = null;
  if (!value) info = <Waiting />;
  else if (step === 2 && dose !== null && dose > 0) info = <>Dry dose <b className="tabular font-mono font-medium text-milk">{dose.toFixed(2)} g</b></>;
  else if (step === 4 && preview) info = <>Yield <b className="tabular font-mono font-medium text-milk">{preview.yield.toFixed(2)} g</b></>;
  else if (step === 5 && liveShot && liveShot.retainedWater !== null)
    info = <>Retained <b className="tabular font-mono font-medium text-milk">{liveShot.retainedWater.toFixed(2)} g</b></>;

  const slide = reduce ? { opacity: 1, x: 0 } : undefined;

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {/* Upper area scrolls if the screen is very short; the keypad and Next button below never move. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pt-2">
        <header>
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{config.title}</h1>
            <p className="shrink-0 text-sm text-milk/60">Step {step} of 5</p>
          </div>
          <div className="mt-1.5 flex gap-1.5" role="presentation">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className={cn("h-1.5 flex-1 rounded-full", s < step ? "bg-crema" : s === step ? "bg-crema/70" : "bg-white/15")} />
            ))}
          </div>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={step}
            initial={slide ?? { opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={slide ?? { opacity: 0, x: -28 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
            className="glass rounded-3xl p-3"
          >
            {/* the title already says what to weigh, so the longer prompt only shows when there is room */}
            <p className="text-sm leading-snug text-milk/75 [@media(max-height:720px)]:hidden">{config.prompt}</p>

            <div className="mt-2 flex items-baseline justify-center gap-2" aria-live="polite">
              <span
                className={cn(
                  "tabular font-mono text-[clamp(2.75rem,8dvh,4.5rem)] font-semibold leading-none tracking-tight",
                  value ? "text-milk" : "text-milk/25",
                )}
                data-testid="readout"
              >
                {value || "0"}
              </span>
              <span className="font-mono text-2xl text-crema">g</span>
              {!value && <span className="sr-only">Waiting for the scale reading</span>}
            </div>

            {showRatio ? (
              <div className="mt-2">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-milk/70">{info}</span>
                  <span className="tabular shrink-0 font-mono text-xl font-semibold" data-testid="ratio">
                    {ratio === null ? "1 : -" : `1 : ${ratio.toFixed(2)}`}
                  </span>
                </div>
                <RatioSpectrum ratio={ratio} />
              </div>
            ) : (
              <p className="mt-2 flex min-h-6 items-center justify-center text-sm text-milk/70">{info}</p>
            )}

            {error && (
              <p role="alert" className="mt-2 text-center text-sm text-ristretto">
                {error}
              </p>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      <div className="grid shrink-0 gap-2 px-4 pb-2 pt-3">
        <Keypad onKey={(key) => dispatch({ type: "key", field, key })} />
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: "back" })}
            disabled={step === 1}
            aria-label="Previous step"
            className="glass flex h-14 w-14 items-center justify-center rounded-2xl active:scale-95 disabled:opacity-30"
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "next" })}
            disabled={!canAdvance(draft)}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-crema text-lg font-semibold text-espresso transition active:scale-[0.98] disabled:bg-white/10 disabled:text-milk/40"
          >
            {step === 5 ? (skipping ? "Skip wet weight" : "See my shot") : "Next"}
            <ArrowRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </main>
  );
}
