import { STATE_LEN } from "./perm";

/** Solved state s0 = [1,2,...,48] as a Uint16Array. */
export const s0: Uint16Array = new Uint16Array(STATE_LEN);
for (let i = 0; i < STATE_LEN; i++) s0[i] = i + 1;
