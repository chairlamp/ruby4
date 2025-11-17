import { describe, it, expect } from "vitest";
import { identity34, project34 } from "../core-r4";
import type { V4 } from "../core-r4";

describe("E-v0.4 — 3×4 projection with perspective", () => {
  it("identity34 with perspective matches formula", () => {
    const P = identity34();
    const v: V4 = [1, 2, 3, 0];
    const d = 5;
    const [x, y, z] = project34(P, v, d);
    expect(x).toBeCloseTo(1 / 5);
    expect(y).toBeCloseTo(2 / 5);
    expect(z).toBeCloseTo(3 / 5);
  });
});
