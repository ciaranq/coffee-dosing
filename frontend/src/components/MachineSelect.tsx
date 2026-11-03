"use client";

import { ChevronDown, Coffee } from "lucide-react";
import { MACHINES } from "@/lib/machines";
import { useMachine } from "@/lib/useMachine";

/** Machine picker for the top of every page. Native select: the OS picker is big and easy to hit with wet hands. */
export function MachineSelect() {
  const { machineId, select } = useMachine();
  return (
    <label className="glass relative flex h-11 min-w-0 flex-1 items-center rounded-xl">
      <span className="sr-only">Your espresso machine</span>
      <Coffee className="pointer-events-none absolute left-3 size-4 text-crema" aria-hidden="true" />
      <select
        value={machineId}
        onChange={(e) => select(e.target.value)}
        className="h-full w-full min-w-0 appearance-none truncate rounded-xl bg-transparent pl-9 pr-9 text-base font-medium text-milk"
      >
        {MACHINES.map((m) => (
          <option key={m.id} value={m.id} className="bg-espresso text-milk">
            {m.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-milk/60" aria-hidden="true" />
    </label>
  );
}
