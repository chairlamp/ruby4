import { describe, it, expect } from "vitest";
import { tokenize, inverseToken, invertSequence } from "../core/parser";
import { permutationFor, compose, S0 } from "../core/moves";
import { cyclesOf, permutationOrder } from "../core/cycles";

describe("parser + cycles", () => {
  it("accepts ASCII and Unicode prime", () => {
    expect(tokenize("R U L' D2")).toEqual(["R", "U", "L'", "D2"]);
    expect(tokenize("R U L' D2")).toEqual(["R", "U", "L'", "D2"]);
  });
  it("inverse token and sequence work", () => {
    expect(inverseToken("R")).toBe("R'");
    expect(inverseToken("R'")).toBe("R");
    expect(inverseToken("R2")).toBe("R2");
    expect(invertSequence(["R", "U", "L'"])).toEqual(["L", "U'", "R'"]);
  });
  it("cycle decomposition and permutation order make sense", () => {
    const P = permutationFor("R");
    const cs = cyclesOf(P, true);
    expect(cs.flat().length).toBe(48);
    expect(permutationOrder(P)).toBeGreaterThan(1);
  });
  it("scramble inverts cleanly using parser", () => {
    const seq = tokenize("F R U L D' F B' R U");
    const P = seq.reduce((acc, t) => compose(permutationFor(t), acc), S0);
    const inv = invertSequence(seq);
    const Q = inv.reduce((acc, t) => compose(permutationFor(t), acc), P);
    expect(Array.from(Q)).toEqual(Array.from(S0));
  });
});
