import { describe, it, expect } from "vitest";
import { hypercubeVertices4, hypercubeEdges4, hypercubeCells4 } from "../core-r4";

describe("E-v0.3 — Tesseract skeleton", () => {
  it("has 16 vertices", () => {
    const v = hypercubeVertices4();
    expect(v.length).toBe(16 * 4);
  });

  it("has 32 unique edges", () => {
    const e = hypercubeEdges4();
    expect(e.length).toBe(32);
    const seen = new Set(e.map(([a, b]) => (a < b ? `${a}-${b}` : `${b}-${a}`)));
    expect(seen.size).toBe(32);
  });

  it("has 8 cells with 8 verts each", () => {
    const c = hypercubeCells4();
    expect(c.length).toBe(8);
    c.forEach((cell) => expect(cell.length).toBe(8));
  });
});
