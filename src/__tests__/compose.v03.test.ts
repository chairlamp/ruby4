import { describe, it, expect } from "vitest";
import { compose48, transpose48, identity48, type Perm48 } from "../core/perm";
import { quarter, prime, double } from "../core/moves";
import { parseMoves } from "../core/parse";

type Token = { face: "U" | "D" | "L" | "R" | "F" | "B"; suffix?: "'" | "2" | "" | undefined };

function tokenToPerm(t: Token): Perm48 {
  switch (t.suffix) {
    case "'":
      return prime(t.face);
    case "2":
      return double(t.face);
    default:
      return quarter(t.face);
  }
}

function seqToPerm(tokens: Token[]): Perm48 {
  let P = identity48();
  for (const t of tokens) P = compose48(tokenToPerm(t), P);
  return P;
}

describe("A v0.3 — Composition & parsing", () => {
  const samples = [
    "F R U L D' F B' R U",
    "R U R' U'",
    "U2 F2 R2 B2 L2 D2",
    "F' F",
    "R2 R2",
    "U U U U",
    "B D' L F2 R U' B2"
  ];

  it("compose(seq) · compose(seq)^T = I", () => {
    for (const s of samples) {
      const tokens = parseMoves(s).map(({ face, kind }) => ({
        face,
        suffix: kind === "prime" ? "'" : kind === "double" ? "2" : undefined
      })) as Token[];
      const P = seqToPerm(tokens);
      const I = compose48(P, transpose48(P));
      expect(I.every((v, i) => v === i)).toBe(true);
    }
  });

  it("double equals quarter∘quarter for each face", () => {
    const faces: Token["face"][] = ["U", "D", "L", "R", "F", "B"];
    for (const face of faces) {
      const q = quarter(face);
      const q2 = compose48(q, q);
      const d = double(face);
      expect(Array.from(d)).toEqual(Array.from(q2));
    }
  });

  it("parser+composer agrees with manual composition on a few sequences", () => {
    const s = "F R U L D' F B' R U";
    const P1 = seqToPerm(
      parseMoves(s).map(({ face, kind }) => ({
        face,
        suffix: kind === "prime" ? "'" : kind === "double" ? "2" : undefined
      })) as Token[]
    );
    const manual: Token[] = [
      { face: "F" },
      { face: "R" },
      { face: "U" },
      { face: "L" },
      { face: "D", suffix: "'" },
      { face: "F" },
      { face: "B", suffix: "'" },
      { face: "R" },
      { face: "U" }
    ];
    const P2 = seqToPerm(manual);
    expect(Array.from(P1)).toEqual(Array.from(P2));
  });
});
