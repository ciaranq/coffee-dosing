"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import { DIALIN_RESET_EVENT } from "@/components/BottomNav";
import { Keypad } from "@/components/Keypad";
import { RatioSpectrum } from "@/components/RatioSpectrum";
import {
  LAST_GUIDED_STEP,
  RESULT_STEP,
  STEP_WEIGHT,
  canAdvance,
  hasProgress,
  isWeightStep,
  shotFromDraft,
  stepError,
  type Step,
} from "@/lib/draft";
import { computeShot, parseGrams } from "@/lib/math";
import { useDialInDraft } from "@/lib/useDialInDraft";
import { cn } from "@/lib/utils";
import { ResultStep } from "./ResultStep";

type GuidedStep = Exclude<Step, typeof RESULT_STEP>;

// The guided flow. Steps 1 and 5 have nothing to weigh: the user does the thing, then taps on.
const STEPS: Record<GuidedStep, { title: string; prompt: string; done?: string; badge: string }> = {
  1: {
    title: "Zero your scale",
    prompt: "Switch the scale on and tare it until it reads 0.0 g.",
    done: "Scale reads zero",
    badge: "Prep",
  },
  2: {
    title: "Empty portafilter",
    prompt: "Wipe the basket dry and put the empty portafilter on the scale.",
    badge: "Tare 1",
  },
  3: {
    title: "Empty cup",
    prompt: "Place the cup you are pulling into on the scale.",
    badge: "Tare 2",
  },
  4: {
    title: "Portafilter with coffee",
    prompt: "Grind, distribute and tamp your dose, then weigh the portafilter again.",
    badge: "Dry Dose",
  },
  5: {
    title: "Pull your shot",
    prompt: "Put the cup under the spout, lock in the portafilter and pull the shot.",
    done: "Shot pulled",
    badge: "Brew",
  },
  6: {
    title: "Cup with espresso",
    prompt: "Place the cup with your freshly pulled espresso on the scale.",
    badge: "Yield",
  },
  7: {
    title: "Wet portafilter",
    prompt: "Weigh the portafilter straight after the shot, with the used puck still in it. Skip this if you like.",
    badge: "Optional",
  },
};

function Waiting({ hint }: { hint?: string | null }) {
  return (
    <span className="inline-flex items-center gap-2 text-steam">
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-crema opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-crema" />
      </span>
      <span>{hint ? `Waiting for scale · ${hint}` : "Waiting for the scale"}</span>
    </span>
  );
}

function ScaleIllustration() {
  return (
    <div className="glass-well relative flex w-full max-w-[15rem] flex-col items-center rounded-2xl px-5 py-4">
      <div className="mb-2 h-1.5 w-20 rounded-full bg-white/15" aria-hidden="true" />
      <div className="flex w-full items-baseline justify-between rounded-xl border border-white/10 bg-black/50 px-4 py-2.5">
        <span className="font-mono text-[0.65rem] uppercase tracking-widest text-crema">TARE</span>
        <div className="flex items-baseline gap-1">
          <span className="tabular font-mono text-3xl font-semibold tracking-tight text-milk">0.0</span>
          <span className="font-mono text-sm text-crema">g</span>
        </div>
      </div>
    </div>
  );
}

function PullShotIllustration({ dose }: { dose: number | null }) {
  return (
    <div className="glass-well relative flex w-full max-w-[15rem] flex-col items-center rounded-2xl px-5 py-3.5">
      {/* Portafilter spout + twin espresso streams */}
      <svg viewBox="0 0 120 68" className="h-14 w-28" aria-hidden="true">
        <rect x="28" y="4" width="64" height="14" rx="4" fill="#c9bfae" fillOpacity="0.25" stroke="#f4efe7" strokeOpacity="0.35" />
        <path d="M46 18 L46 25 L74 25 L74 18" fill="none" stroke="#f4efe7" strokeOpacity="0.45" strokeWidth="2" />
        <line x1="52" y1="25" x2="52" y2="52" stroke="#ee3740" strokeWidth="3" strokeLinecap="round" />
        <line x1="68" y1="25" x2="68" y2="52" stroke="#ee3740" strokeWidth="3" strokeLinecap="round" />
        <path d="M36 46 Q36 64 60 64 Q84 64 84 46 Z" fill="#6b4a2b" fillOpacity="0.55" stroke="#f4efe7" strokeOpacity="0.5" strokeWidth="1.5" />
        <ellipse cx="60" cy="48" rx="22" ry="3.5" fill="#ee3740" fillOpacity="0.75" />
      </svg>
      <div className="mt-1.5 flex items-center gap-2 font-mono text-xs text-steam">
        <span>Target 25–32 s</span>
        {dose !== null && dose > 0 && (
          <>
            <span className="text-white/25">·</span>
            <span className="tabular text-milk">{dose.toFixed(1)} g in</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function DialInPage() {
  const { draft, hydrated, stale, dispatch, resume, discard, finish } = useDialInDraft();
  const reduce = useReducedMotion();
  const step = draft.step;

  // Listen for BottomNav "Dial in" clicks to zero everything and start a fresh shot at step 1
  useEffect(() => {
    const onReset = () => {
      discard();
      window.history.replaceState(null, "", `${window.location.pathname}?step=1`);
    };
    window.addEventListener(DIALIN_RESET_EVENT, onReset);
    return () => window.removeEventListener(DIALIN_RESET_EVENT, onReset);
  }, [discard]);

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
    const savedEntries = [
      ["Empty PF", draft.weights.pfEmpty],
      ["Empty cup", draft.weights.cupEmpty],
      ["Dry PF", draft.weights.pfDry],
      ["Full cup", draft.weights.cupFull],
    ].filter(([, v]) => !!v);

    return (
      <main className="flex flex-1 flex-col justify-center gap-4 p-4">
        <section className="glass rounded-3xl p-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-crema/15 px-3 py-1 font-mono text-xs font-medium text-crema">
            Saved draft · Step {Math.min(draft.step, LAST_GUIDED_STEP)} of {LAST_GUIDED_STEP}
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Pick up where you left off?</h1>
          <p className="mt-1.5 text-sm text-milk/70">You have an unfinished shot from more than 12 hours ago.</p>

          {savedEntries.length > 0 && (
            <dl className="glass-well mt-4 grid grid-cols-2 gap-2 rounded-2xl p-3 text-xs">
              {savedEntries.map(([label, val]) => (
                <div key={label} className="flex items-baseline justify-between px-1">
                  <dt className="text-milk/60">{label}</dt>
                  <dd className="tabular font-mono font-medium text-milk">{val} g</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-5 grid gap-2.5">
            <button
              type="button"
              onClick={resume}
              className="h-14 rounded-2xl bg-crema text-lg font-semibold text-espresso transition active:scale-[0.98]"
            >
              Resume shot
            </button>
            <button
              type="button"
              onClick={discard}
              className="glass h-14 rounded-2xl text-lg font-medium text-milk transition active:scale-[0.98]"
            >
              Start a new shot
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (step === RESULT_STEP) {
    return (
      <main className="flex flex-1 flex-col gap-3.5 p-4">
        <ResultStep draft={draft} dispatch={dispatch} onBack={() => dispatch({ type: "back" })} onSaved={finish} />
      </main>
    );
  }

  const config = STEPS[step];
  const weightStep = isWeightStep(step);
  const field = weightStep ? STEP_WEIGHT[step] : null;
  const value = field ? (draft.weights[field] ?? "") : "";
  const error = field && value ? stepError(draft) : null;
  const pfEmpty = parseGrams(draft.weights.pfEmpty);
  const pfDry = parseGrams(draft.weights.pfDry);
  const cupEmpty = parseGrams(draft.weights.cupEmpty);
  const dose = pfEmpty !== null && pfDry !== null ? Math.round((pfDry - pfEmpty) * 100) / 100 : null;

  // live ratio preview once the cup is on the scale (step 6), using whatever is typed so far
  const preview = (() => {
    if (step < 6) return null;
    const cupFull = parseGrams(draft.weights.cupFull);
    if (pfEmpty === null || pfDry === null || cupEmpty === null || cupFull === null) return null;
    const outcome = computeShot({ pfEmpty, pfDry, cupEmpty, cupFull });
    return outcome.ok ? outcome.result : null;
  })();
  const ratio = step >= 7 ? (liveShot?.ratio ?? null) : (preview?.ratio ?? null);
  const showRatio = step >= 6;
  const skipping = step === 7 && !value;

  const tareHint =
    step === 4 && pfEmpty !== null
      ? `Empty ${pfEmpty.toFixed(1)} g`
      : step === 6 && cupEmpty !== null
        ? `Cup ${cupEmpty.toFixed(1)} g`
        : step === 7 && pfDry !== null
          ? `Dry ${pfDry.toFixed(1)} g`
          : null;

  // one line of context under the reading
  let info: React.ReactNode = null;
  if (!value) info = <Waiting hint={tareHint} />;
  else if (step === 2 && pfEmpty !== null)
    info = (
      <>
        Basket tare <b className="tabular font-mono font-medium text-milk">{pfEmpty.toFixed(2)} g</b>
      </>
    );
  else if (step === 3 && cupEmpty !== null)
    info = (
      <>
        Cup tare <b className="tabular font-mono font-medium text-milk">{cupEmpty.toFixed(2)} g</b>
      </>
    );
  else if (step === 4 && dose !== null && dose > 0)
    info = (
      <>
        Dry dose <b className="tabular font-mono font-medium text-milk">{dose.toFixed(2)} g</b>
      </>
    );
  else if (step === 6 && preview)
    info = (
      <>
        Yield <b className="tabular font-mono font-medium text-milk">{preview.yield.toFixed(2)} g</b>
        {dose !== null && <span className="text-milk/50"> / {dose.toFixed(1)} g in</span>}
      </>
    );
  else if (step === 7 && liveShot && liveShot.retainedWater !== null)
    info = (
      <>
        Retained <b className="tabular font-mono font-medium text-milk">{liveShot.retainedWater.toFixed(2)} g</b>
      </>
    );

  const nextLabel = weightStep
    ? step === 7
      ? skipping
        ? "Skip wet weight"
        : "See my shot"
      : "Next"
    : (config.done ?? "Next");
  const slide = reduce ? { opacity: 1, x: 0 } : undefined;
  const canReset = step > 1 || hasProgress(draft);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {/* Upper area scrolls if the screen is very short; the keypad and Next button below never move. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pt-1.5">
        <header>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-baseline gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{config.title}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {canReset && (
                <button
                  type="button"
                  onClick={() => {
                    discard();
                    window.history.replaceState(null, "", `${window.location.pathname}?step=1`);
                  }}
                  aria-label="Start a new shot"
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 text-xs font-medium text-milk/75 transition active:scale-95"
                >
                  <RotateCcw className="size-3 text-crema" aria-hidden="true" />
                  Reset
                </button>
              )}
              <p className="tabular font-mono text-xs text-milk/60">
                {step}/{LAST_GUIDED_STEP}
              </p>
            </div>
          </div>
          <div className="mt-1.5 flex gap-1" role="presentation">
            {Array.from({ length: LAST_GUIDED_STEP }, (_, i) => i + 1).map((s) => (
              <span
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  s < step ? "bg-crema" : s === step ? "bg-crema/75 shadow-[0_0_8px_rgb(238_55_64_/_0.6)]" : "bg-white/15",
                )}
              />
            ))}
          </div>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={step}
            initial={slide ?? { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={slide ?? { opacity: 0, x: -24 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: "easeOut" }}
            className={cn("glass rounded-3xl p-3", !weightStep && "flex flex-1 flex-col justify-between p-5")}
          >
            {weightStep ? (
              <>
                {/* the title already says what to weigh, so the longer prompt only shows when there is room */}
                <p className="text-sm leading-snug text-milk/75 [@media(max-height:720px)]:hidden">{config.prompt}</p>

                <div className="glass-well mt-1.5 flex items-baseline justify-center gap-2 rounded-2xl py-2" aria-live="polite">
                  <span
                    className={cn(
                      "tabular font-mono text-[clamp(2.5rem,7.2dvh,4.25rem)] font-semibold leading-none tracking-tight",
                      value ? "text-milk" : "text-milk/25",
                    )}
                    data-testid="readout"
                  >
                    {value || "0"}
                  </span>
                  <span className="font-mono text-2xl font-medium text-crema">g</span>
                  {!value && <span className="sr-only">Waiting for the scale reading</span>}
                </div>

                {showRatio ? (
                  <div className="mt-2">
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-xs text-milk/75">{info}</span>
                      <span className="tabular shrink-0 font-mono text-lg font-semibold text-milk" data-testid="ratio">
                        {ratio === null ? "1 : -" : `1 : ${ratio.toFixed(2)}`}
                      </span>
                    </div>
                    <RatioSpectrum ratio={ratio} />
                  </div>
                ) : (
                  <p className="mt-2 flex min-h-5 items-center justify-center gap-1.5 text-sm text-milk/75">{info}</p>
                )}

                {error && (
                  <p role="alert" className="mt-1.5 text-center text-xs font-medium text-red-tint">
                    {error}
                  </p>
                )}
              </>
            ) : (
              // Instruction step: fills the stage with visual instrument illustration + action checklist
              <div className="flex flex-1 flex-col items-center justify-between gap-3 py-1 text-center" data-testid="instruction">
                <span className="rounded-full border border-crema/30 bg-crema/15 px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-crema">
                  {step === 1 ? "Step 1 · Scale Prep" : "Step 5 · Extraction"}
                </span>

                <div className="flex flex-col items-center gap-3">
                  {step === 1 ? <ScaleIllustration /> : <PullShotIllustration dose={dose} />}
                  <p className="max-w-[28ch] text-lg font-medium leading-snug text-milk">{config.prompt}</p>
                </div>

                <ul className="grid w-full grid-cols-2 gap-2 text-left text-xs text-milk/80">
                  {(step === 1
                    ? ["Flat, dry surface", "Press TARE to 0.0 g"]
                    : ["Cup centred under spout", "Start timer with pump"]
                  ).map((item) => (
                    <li key={item} className="glass-well flex items-center gap-2 rounded-xl px-3 py-2.5">
                      <CheckCircle2 className="size-4 shrink-0 text-crema" aria-hidden="true" />
                      <span className="leading-tight">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      <div className="grid shrink-0 gap-2 px-4 pb-2 pt-2.5">
        {field && <Keypad onKey={(key) => dispatch({ type: "key", field, key })} />}
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: "back" })}
            disabled={step === 1}
            aria-label="Previous step"
            className="glass flex h-14 w-14 items-center justify-center rounded-2xl transition active:scale-95 disabled:opacity-30"
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "next" })}
            disabled={!canAdvance(draft)}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-crema text-lg font-semibold text-espresso shadow-[0_8px_24px_-6px_rgb(238_55_64_/_0.55)] transition active:scale-[0.98] disabled:bg-white/10 disabled:text-milk/40 disabled:shadow-none"
          >
            {nextLabel}
            <ArrowRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </main>
  );
}
