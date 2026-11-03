"use client";

import { Delete } from "lucide-react";
import type { KeypadKey } from "@/lib/draft";
import { cn } from "@/lib/utils";

const ROWS: KeypadKey[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "back"],
];

interface Props {
  onKey: (key: KeypadKey) => void;
  /** Hide the decimal point (e.g. for whole-number fields). */
  allowDecimal?: boolean;
}

function buzz() {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* unsupported */
  }
}

/** Oversized keypad for wet hands: 4.5 rem keys, no native number input, no typing. */
export function Keypad({ onKey, allowDecimal = true }: Props) {
  return (
    <div role="group" aria-label="Number pad" className="grid grid-cols-3 gap-2">
      {ROWS.flat().map((key) => {
        const isBack = key === "back";
        const disabled = key === "." && !allowDecimal;
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            aria-label={isBack ? "Delete last digit" : key === "." ? "Decimal point" : key}
            onClick={() => {
              buzz();
              onKey(key);
            }}
            className={cn(
              "glass tabular flex h-[clamp(2.75rem,7.5dvh,4.5rem)] touch-manipulation select-none items-center justify-center rounded-2xl font-mono text-3xl font-medium text-milk transition-transform duration-75 active:scale-95 active:bg-crema/25 disabled:opacity-30",
              isBack && "text-crema",
            )}
          >
            {isBack ? <Delete className="size-7" aria-hidden="true" /> : key}
          </button>
        );
      })}
    </div>
  );
}
