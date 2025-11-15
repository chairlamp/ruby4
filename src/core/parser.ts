import type { MoveToken } from "./types";

const BASE = ["U", "D", "L", "R", "F", "B"] as const;
const SUFFIX = ["", "'", "2"] as const;

const normalizePrime = (s: string) =>
  s.replace(/[\u2032\u2035\u02B9\u2019\u275B]/g, "'");

export function isMoveToken(s: string): s is MoveToken {
  const t = normalizePrime(s.trim().toUpperCase());
  if (!t) return false;
  const b = t[0];
  if (!BASE.includes(b as (typeof BASE)[number])) return false;
  const suf = t.slice(1);
  return SUFFIX.includes(suf as (typeof SUFFIX)[number]);
}

export function normalizeToken(s: string): MoveToken {
  const t = normalizePrime(s.trim().toUpperCase());
  if (!isMoveToken(t)) throw new Error(`Invalid token: "${s}"`);
  return t as MoveToken;
}

export function tokenize(input: string): MoveToken[] {
  const cleaned = normalizePrime(input).toUpperCase();
  const parts = cleaned.split(/[\s,]+/).filter(Boolean);
  return parts.map(normalizeToken);
}

export function inverseToken(t: MoveToken): MoveToken {
  if (t.endsWith("2")) return t;
  if (t.endsWith("'")) return (t[0] as MoveToken);
  return (t[0] + "'") as MoveToken;
}

export function invertSequence(seq: MoveToken[]): MoveToken[] {
  const out: MoveToken[] = [];
  for (let i = seq.length - 1; i >= 0; i--) {
    out.push(inverseToken(seq[i]));
  }
  return out;
}

export function expandDoubles(seq: MoveToken[]): MoveToken[] {
  const out: MoveToken[] = [];
  for (const t of seq) {
    if (t.endsWith("2")) {
      out.push(t[0] as MoveToken, t[0] as MoveToken);
    } else {
      out.push(t);
    }
  }
  return out;
}
