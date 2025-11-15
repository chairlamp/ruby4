import type { MoveToken, Perm } from "./types";
import { S0, compose, permutationFor } from "./moves";

export class CubeState {
  private P: Perm = S0.slice() as Perm;

  reset() {
    this.P = S0.slice() as Perm;
  }

  applyMove(token: MoveToken) {
    this.P = compose(permutationFor(token), this.P);
  }

  applySequence(seq: MoveToken[]) {
    for (const token of seq) {
      this.applyMove(token);
    }
  }

  getPermutation(): Perm {
    return this.P;
  }
}
