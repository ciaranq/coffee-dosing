import { describe, expect, it } from "bun:test";
import { DEFAULT_MACHINE_ID, MACHINES, parseMachineId } from "../../src/lib/machines";

describe("machines", () => {
  it("lists the five supported machines, Barista Express first", () => {
    expect(MACHINES.map((m) => m.name)).toEqual([
      "Breville Barista Express",
      "Breville Dual Boiler",
      "La Marzocco Linea Micra",
      "Lelit Mara X",
      "Rocket Appartamento",
    ]);
    expect(DEFAULT_MACHINE_ID).toBe("breville-barista-express");
  });

  it("has unique ids", () => {
    expect(new Set(MACHINES.map((m) => m.id)).size).toBe(MACHINES.length);
  });

  it("parseMachineId keeps known ids and falls back to the default", () => {
    expect(parseMachineId("lelit-mara-x")).toBe("lelit-mara-x");
    expect(parseMachineId("nonsense")).toBe(DEFAULT_MACHINE_ID);
    expect(parseMachineId(null)).toBe(DEFAULT_MACHINE_ID);
    expect(parseMachineId(undefined)).toBe(DEFAULT_MACHINE_ID);
  });
});
