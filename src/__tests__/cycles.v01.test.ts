import { describe, it, expect } from "vitest";
import { identity48 } from "../core/perm";
import { cyclesOf, movedCount } from "../core/cycles";
import { quarter } from "../core/moves";
import type { Face } from "../core/facelets";

describe("C v0.1 — cycle basics", () => {
  it("identity: 48 fixed cycles; 0 moved", () => {
    const I = identity48();
    const cs = cyclesOf(I, { includeFixed: true });
    expect(cs.length).toBe(48);
    expect(movedCount(I)).toBe(0);
  });

  it("each quarter turn moves 20 stickers", () => {
    const faces: Face[] = ["U", "D", "L", "R", "F", "B"];
    for (const f of faces) {
      const Q = quarter(f);
      expect(movedCount(Q)).toBe(20);
      const cs = cyclesOf(Q, { includeFixed: false });
      const sum = cs.reduce((s, c) => s + c.length, 0);
      expect(sum).toBe(20);
      expect(cs.every((c) => c.length >= 2)).toBe(true);
    }
  });
});
