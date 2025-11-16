import type { Face } from "./facelets";

export type MoveKind = "quarter" | "prime" | "double";
export interface MoveToken {
  face: Face;
  kind: MoveKind;
}

const PRIME_CHARS = new Set(["'", "′", "’"]);
const FACE_CHARS = new Set(["U", "D", "L", "R", "F", "B"]);

function normalizePrime(ch: string): "'" | "" {
  return PRIME_CHARS.has(ch) ? "'" : "";
}

export function parseMoves(input: string): MoveToken[] {
  const s = (input || "").trim();
  if (!s) return [];

  const tokens: MoveToken[] = [];
  const parts = s.split(/[\s,]+/).filter(Boolean);

  for (const raw of parts) {
    const t = raw.toUpperCase();
    const face = t[0];
    if (!FACE_CHARS.has(face)) {
      throw new Error(`Unknown move "${raw}"`);
    }

    const suf1 = t[1] ?? "";
    const suf2 = t[2] ?? "";

    let kind: MoveKind = "quarter";
    const p1 = normalizePrime(suf1);
    const is2 = suf1 === "2" || suf2 === "2";
    if (is2) kind = "double";
    else if (p1 === "'") kind = "prime";

    tokens.push({ face: face as Face, kind });
  }

  return tokens;
}
