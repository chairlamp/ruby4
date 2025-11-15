import type { Perm } from "./types";

export type Cycle = number[];

export function cyclesOf(P: Perm, includeFixed = false): Cycle[] {
  const n = P.length;
  const seen = new Uint8Array(n);
  const out: Cycle[] = [];
  for (let i = 0; i < n; i++) {
    if (seen[i]) continue;
    let j = i;
    const cyc: number[] = [];
    do {
      cyc.push(j);
      seen[j] = 1;
      j = P[j];
    } while (j !== i);
    if (includeFixed || cyc.length > 1) {
      out.push(cyc);
    }
  }
  return out;
}

export function permutationOrder(P: Perm): number {
  const cs = cyclesOf(P, true);
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
  const lcm = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : Math.abs(a * b) / gcd(a, b));
  return cs.reduce((acc, c) => lcm(acc, c.length), 1);
}
