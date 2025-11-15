import { describe, it, expect } from "vitest";
import type { MoveToken, Perm } from "../core/types";
import { compose, inverse, isValidPermutation, permutationFor, S0 } from "../core/moves";

const MOVE_TOKENS: MoveToken[] = [
  "U",
  "D",
  "L",
  "R",
  "F",
  "B",
  "U'",
  "D'",
  "L'",
  "R'",
  "F'",
  "B'",
  "U2",
  "D2",
  "L2",
  "R2",
  "F2",
  "B2",
];

const BASE_MOVES: MoveToken[] = ["U", "D", "L", "R", "F", "B"];

const scramble: MoveToken[] = ["F", "R", "U", "L", "D'", "F", "B'", "R", "U"];

function permutationMatrix(perm: Perm): number[][] {
  const size = perm.length;
  return Array.from({ length: size }, (_, row) => {
    const r = Array(size).fill(0);
    r[perm[row]] = 1;
    return r;
  });
}

function expectIdentity(matrix: number[][]) {
  const size = matrix.length;
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      let sum = 0;
      for (let k = 0; k < size; k++) {
        sum += matrix[i][k] * matrix[j][k];
      }
      expect(sum).toBe(i === j ? 1 : 0);
    }
  }
}

function expectPermEqual(a: Perm, b: Perm) {
  expect(Array.from(a)).toEqual(Array.from(b));
}

describe("permutation properties", () => {
  it("permutationFor returns a bijection for every move", () => {
    for (const token of MOVE_TOKENS) {
      const perm = permutationFor(token);
      expect(isValidPermutation(perm)).toBe(true);
      const seen = new Set<number>();
      for (const value of perm) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(48);
        expect(seen.has(value)).toBe(false);
        seen.add(value);
      }
      expect(seen.size).toBe(48);
    }
  });

  it("permutation matrices are orthonormal", () => {
    for (const token of MOVE_TOKENS) {
      const perm = permutationFor(token);
      const matrix = permutationMatrix(perm);
      expectIdentity(matrix);
    }
  });

  it("move composed with its inverse returns identity", () => {
    for (const token of BASE_MOVES) {
      const prime = (token + "'") as MoveToken;
      const composed = compose(permutationFor(token), permutationFor(prime));
      expectPermEqual(composed, S0);
    }
  });

  it("double turns equal composing the move twice", () => {
    for (const token of BASE_MOVES) {
      const double = (token + "2") as MoveToken;
      const permSingle = permutationFor(token);
      const permDouble = permutationFor(double);
      const composed = compose(permSingle, permSingle);
      expectPermEqual(permDouble, composed);
    }
  });

  it("sample scramble composes to a valid permutation and inverts cleanly", () => {
    let acc = S0;
    for (const token of scramble) {
      acc = compose(permutationFor(token), acc);
    }
    expect(isValidPermutation(acc)).toBe(true);
    const inv = inverse(acc);
    const identity = compose(inv, acc);
    expectPermEqual(identity, S0);
  });
});
