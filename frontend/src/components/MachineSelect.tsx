"use client";

import { ChevronDown, Coffee } from "lucide-react";
import { MACHINES } from "@/lib/machines";
import { useMachine } from "@/lib/useMachine";

/** Machine picker for the top of every page. Native select: the OS picker is big and easy to hit with wet hands. */
export function MachineSelect() {
  const { machineId, select } = useMachine();
  return (
    <label className="glass relative flex h-11 min-w-0 flex-1 items-center rounded-2xl transition focus-within:border-steam/50">
      <span className="sr-only">Your espresso machine</span>
      <span
        className="pointer-events-none absolute left-2.5 flex size-6 items-center justify-center rounded-lg bg-crema/15 text-crema"
        aria-hidden="true"
      >
        <Coffee className="size-3.5" />
      </span>
      <select
        value={machineId}
        onChange={(e) => select(e.target.value)}
        className="h-full w-full min-w-0 cursor-pointer appearance-none truncate rounded-2xl bg-transparent pl-10 pr-9 text-base font-medium text-milk focus:outline-none"
      >
        {MACHINES.map((m) => (
          <option key={m.id} value={m.id} className="bg-espresso text-milk">
            {m.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-stone" aria-hidden="true" />
    </label>
  );
}
