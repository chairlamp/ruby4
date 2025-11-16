import type { Perm48 } from "./perm";
import { compose48, identity48, transpose48 } from "./perm";
import { quarter, prime, double } from "./moves";
import { parseMoves, type MoveToken } from "./parse";

function permForToken(t: MoveToken): Perm48 {
  if (t.kind === "quarter") return quarter(t.face);
  if (t.kind === "prime") return prime(t.face);
  return double(t.face);
}

export function composeTokens(tokens: MoveToken[]): Perm48 {
  let P = identity48();
  for (const tok of tokens) {
    const M = permForToken(tok);
    P = compose48(M, P);
  }
  return P;
}

export function composeString(seq: string): Perm48 {
  return composeTokens(parseMoves(seq));
}

export function invertTokens(tokens: MoveToken[]): MoveToken[] {
  const inv: MoveToken[] = [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (t.kind === "quarter") inv.push({ face: t.face, kind: "prime" });
    else if (t.kind === "prime") inv.push({ face: t.face, kind: "quarter" });
    else inv.push({ face: t.face, kind: "double" });
  }
  return inv;
}

export function isOrthogonal(P: Perm48): boolean {
  const PT = transpose48(P);
  const I = compose48(P, PT);
  for (let i = 0; i < I.length; i++) if (I[i] !== i) return false;
  return true;
}
