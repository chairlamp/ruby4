export const STATE_LEN = 48;
export type Perm48 = Uint16Array;

export function identity48(): Perm48 {
  const p = new Uint16Array(STATE_LEN);
  for (let i = 0; i < STATE_LEN; i++) p[i] = i;
  return p;
}

/** (A ∘ B)(i) = A[B[i]] */
export function compose48(A: Perm48, B: Perm48): Perm48 {
  if (A.length !== STATE_LEN || B.length !== STATE_LEN) throw new RangeError("perm length != 48");
  const C = new Uint16Array(STATE_LEN);
  for (let i = 0; i < STATE_LEN; i++) C[i] = A[B[i]];
  return C;
}

export function transpose48(P: Perm48): Perm48 {
  const PT = new Uint16Array(STATE_LEN);
  for (let i = 0; i < STATE_LEN; i++) PT[P[i]] = i;
  return PT;
}

export function validate48(P: Perm48): void {
  if (P.length !== STATE_LEN) throw new RangeError("perm length != 48");
  const seen = new Uint8Array(STATE_LEN);
  for (let i = 0; i < STATE_LEN; i++) {
    const v = P[i];
    if (v < 0 || v >= STATE_LEN) throw new RangeError(`perm[${i}] out of range: ${v}`);
    if (seen[v]) throw new Error(`perm not bijection: duplicate ${v}`);
    seen[v] = 1;
  }
}

export function isIdentity48(P: Perm48): boolean {
  for (let i = 0; i < STATE_LEN; i++) if (P[i] !== i) return false;
  return true;
}

/* --------- legacy helpers expected by v0.1 tests --------- */

/** Alias for tests: identity permutation builder. */
export function identityPerm(): Perm48 {
  return identity48();
}

/** Apply a dest→src permutation P to a state vector s (1..48). */
export function applyPermutation(s: Uint16Array, P: Perm48): Uint16Array {
  if (P.length !== STATE_LEN || s.length !== STATE_LEN) {
    throw new RangeError("state/perm length != 48");
  }
  const out = new Uint16Array(STATE_LEN);
  for (let i = 0; i < STATE_LEN; i++) out[i] = s[P[i]];
  return out;
}

/** Small helper used by tests to compare typed arrays. */
export function toArray(u: Uint16Array): number[] {
  return Array.from(u);
}
