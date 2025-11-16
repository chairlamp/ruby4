import { STATE_LEN, type Perm48 } from "./perm";

export interface Cycle {
  members: number[];
  length: number;
}

export function cyclesOf(P: Perm48, opts?: { includeFixed?: boolean }): Cycle[] {
  if (P.length !== STATE_LEN) throw new RangeError("perm length != 48");
  const includeFixed = !!opts?.includeFixed;
  const out: Cycle[] = [];
  const seen = new Uint8Array(P.length);

  for (let i = 0; i < P.length; i++) {
    if (seen[i]) continue;
    let j = i;
    const cyc: number[] = [];
    while (!seen[j]) {
      seen[j] = 1;
      cyc.push(j);
      j = P[j];
    }
    if (cyc.length > 1 || includeFixed) {
      out.push({ members: cyc, length: cyc.length });
    }
  }
  out.sort((a, b) => b.length - a.length);
  return out;
}

export function movedCount(P: Perm48): number {
  return cyclesOf(P).reduce((acc, c) => acc + c.length, 0);
}
