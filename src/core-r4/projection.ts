import type { V4 } from "./r4";

export type M34 = Float32Array;

export function identity34(): M34 {
  const P = new Float32Array(12);
  P[0] = 1;
  P[5] = 1;
  P[10] = 1;
  return P;
}

export function mul34v(P: M34, v: V4): [number, number, number] {
  const x = P[0] * v[0] + P[1] * v[1] + P[2] * v[2] + P[3] * v[3];
  const y = P[4] * v[0] + P[5] * v[1] + P[6] * v[2] + P[7] * v[3];
  const z = P[8] * v[0] + P[9] * v[1] + P[10] * v[2] + P[11] * v[3];
  return [x, y, z];
}

export function project34(P: M34, v: V4, d: number): [number, number, number] {
  const [x, y, z] = mul34v(P, v);
  const denom = d - v[3];
  const k = 1 / denom;
  return [x * k, y * k, z * k];
}

export function pack34to44(P: M34): Float64Array {
  const M = new Float64Array(16);
  M[0] = P[0];
  M[1] = P[1];
  M[2] = P[2];
  M[3] = P[3];
  M[4] = P[4];
  M[5] = P[5];
  M[6] = P[6];
  M[7] = P[7];
  M[8] = P[8];
  M[9] = P[9];
  M[10] = P[10];
  M[11] = P[11];
  M[15] = 1;
  return M;
}
