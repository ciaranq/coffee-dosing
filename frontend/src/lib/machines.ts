// Supported espresso machines. Prototype: every machine behaves the same.
// Later, per-machine settings (pressure, grinder scale, basket size, target ratios) hang off `id`.

export interface Machine {
  id: string;
  name: string;
}

export const MACHINES: readonly Machine[] = [
  { id: "breville-barista-express", name: "Breville Barista Express" },
  { id: "breville-dual-boiler", name: "Breville Dual Boiler" },
  { id: "la-marzocco-linea-micra", name: "La Marzocco Linea Micra" },
  { id: "lelit-mara-x", name: "Lelit Mara X" },
  { id: "rocket-appartamento", name: "Rocket Appartamento" },
];

export const DEFAULT_MACHINE_ID = MACHINES[0].id;
export const MACHINE_STORAGE_KEY = "dialin:machine:v1";

/** Stored value back to a known machine id, falling back to the default for anything unknown. */
export function parseMachineId(raw: string | null | undefined): string {
  return MACHINES.some((m) => m.id === raw) ? (raw as string) : DEFAULT_MACHINE_ID;
}
