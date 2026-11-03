"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearDraft, createDraft, hasProgress, isStale, loadDraft, reducer, saveDraft, type Action, type Draft } from "./draft";

function storage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined; // accessing localStorage can throw when site data is blocked
  }
}

export interface DialInDraft {
  draft: Draft;
  /** False until the stored draft has been read on the client (avoids a hydration mismatch). */
  hydrated: boolean;
  /** A draft older than 12 hours with progress: offer Resume or Discard before showing it. */
  stale: boolean;
  dispatch: (action: Action) => void;
  /** Keep the stale draft and carry on. */
  resume: () => void;
  /** Throw the draft away and start a new one (new clientId). */
  discard: () => void;
  /** Remove the stored draft after a successful save. */
  finish: () => void;
}

/**
 * Wizard state that survives the browser being minimised. Every dispatch writes to localStorage
 * synchronously (mobile browsers do not reliably fire beforeunload) and the draft is re-read when the tab
 * becomes visible again. Contract: docs/contract/wizard-state.md.
 */
export function useDialInDraft(): DialInDraft {
  const [draft, setDraft] = useState<Draft>(() => createDraft(0));
  const [hydrated, setHydrated] = useState(false);
  const [stale, setStale] = useState(false);
  const ref = useRef(draft);

  const adopt = useCallback((next: Draft) => {
    ref.current = next;
    setDraft(next);
  }, []);

  useEffect(() => {
    const stored = loadDraft(storage());
    if (stored && hasProgress(stored)) {
      adopt(stored);
      setStale(isStale(stored));
    } else {
      const fresh = createDraft();
      adopt(fresh);
    }
    setHydrated(true);

    const reload = () => {
      if (document.visibilityState === "hidden") return;
      const latest = loadDraft(storage());
      if (latest && latest.updatedAt > ref.current.updatedAt) adopt(latest);
    };
    document.addEventListener("visibilitychange", reload);
    window.addEventListener("pageshow", reload);
    return () => {
      document.removeEventListener("visibilitychange", reload);
      window.removeEventListener("pageshow", reload);
    };
  }, [adopt]);

  const dispatch = useCallback(
    (action: Action) => {
      const next = reducer(ref.current, action);
      if (next === ref.current) return;
      saveDraft(storage(), next);
      adopt(next);
    },
    [adopt],
  );

  const resume = useCallback(() => {
    const touched = { ...ref.current, updatedAt: Date.now() };
    saveDraft(storage(), touched);
    adopt(touched);
    setStale(false);
  }, [adopt]);

  const discard = useCallback(() => {
    clearDraft(storage());
    adopt(createDraft());
    setStale(false);
  }, [adopt]);

  const finish = useCallback(() => {
    clearDraft(storage());
    adopt(createDraft());
  }, [adopt]);

  return { draft, hydrated, stale, dispatch, resume, discard, finish };
}
