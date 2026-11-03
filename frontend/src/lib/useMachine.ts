"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_MACHINE_ID, MACHINE_STORAGE_KEY, parseMachineId } from "./machines";

function storage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined; // blocked site data can make this throw
  }
}

/** The user's selected machine, remembered on this device. Starts on the default until read on the client. */
export function useMachine() {
  const [machineId, setMachineId] = useState(DEFAULT_MACHINE_ID);

  useEffect(() => {
    try {
      setMachineId(parseMachineId(storage()?.getItem(MACHINE_STORAGE_KEY)));
    } catch {
      /* keep the default */
    }
  }, []);

  const select = useCallback((id: string) => {
    const next = parseMachineId(id);
    setMachineId(next);
    try {
      storage()?.setItem(MACHINE_STORAGE_KEY, next);
    } catch {
      /* storage unavailable: the choice lasts for this visit only */
    }
  }, []);

  return { machineId, select };
}
