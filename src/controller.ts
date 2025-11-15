import { CubeState } from "./core/state3";
import type { MoveToken } from "./core/types";
import { CubeView } from "./cube";

export class CubeController {
  private q: MoveToken[] = [];
  private busy = false;

  constructor(private view: CubeView, private state: CubeState) {}

  enqueue(token: MoveToken) {
    this.q.push(token);
    this.pump();
  }

  enqueueMany(seq: MoveToken[]) {
    this.q.push(...seq);
    this.pump();
  }

  private async pump() {
    if (this.busy) return;
    this.busy = true;
    while (this.q.length) {
      const token = this.q.shift()!;
      await this.view.turn(token);
      this.state.applyMove(token);
    }
    this.busy = false;
  }
}
