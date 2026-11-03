import { describe, expect, it } from "bun:test";
import { cn } from "../../src/lib/utils";

describe("scaffold baseline", () => {
  it("merges tailwind class names cleanly", () => {
    expect(cn("p-4 text-white", "p-6")).toBe("text-white p-6");
  });
});

