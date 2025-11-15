import type { MoveToken } from "../core/types";
import { tokenize, expandDoubles } from "../core/parser";

export type PlayerCallbacks = {
  onPlay: (seq: MoveToken[]) => void;
  onPause: () => void;
  onStep: (tok: MoveToken) => void;
  onBack: () => void;
  onClear: () => void;
  getBuffer?: () => string;
  setBuffer?: (s: string) => void;
};

export function mountPlayer(root: HTMLElement, cb: PlayerCallbacks) {
  root.innerHTML += `
    <div class="player">
      <div class="row">
        <input id="seq" class="seq" placeholder="Type moves e.g. R U L' D2" />
        <button id="preset">Preset (paper)</button>
      </div>
      <div class="row">
        <button id="play">Play</button>
        <button id="pause">Pause</button>
        <button id="step">Step ?</button>
        <button id="back">Step ?</button>
        <label>Speed <input id="speed" type="range" min="0.5" max="2" step="0.1" value="1"></label>
        <button id="clear">Clear Q</button>
      </div>
      <div class="row"><span id="status"></span></div>
    </div>`;

  const seq = root.querySelector<HTMLInputElement>("#seq")!;
  const status = root.querySelector<HTMLSpanElement>("#status")!;
  const presetBtn = root.querySelector<HTMLButtonElement>("#preset")!;
  const play = root.querySelector<HTMLButtonElement>("#play")!;
  const pause = root.querySelector<HTMLButtonElement>("#pause")!;
  const step = root.querySelector<HTMLButtonElement>("#step")!;
  const back = root.querySelector<HTMLButtonElement>("#back")!;
  const speed = root.querySelector<HTMLInputElement>("#speed")!;
  const clear = root.querySelector<HTMLButtonElement>("#clear")!;

  if (cb.getBuffer) {
    seq.value = cb.getBuffer() ?? "";
  }
  const updateStatus = (msg: string) => {
    status.textContent = msg;
  };

  function readSeq(): MoveToken[] {
    const buffer = cb.getBuffer ? cb.getBuffer() ?? "" : seq.value;
    return tokenize(buffer);
  }

  function writeSeq(value: string) {
    if (cb.setBuffer) {
      cb.setBuffer(value);
    } else {
      seq.value = value;
    }
  }

  presetBtn.onclick = () => {
    writeSeq("F R U L D' F B' R U");
  };

  play.onclick = () => {
    try {
      const sequence = readSeq();
      cb.onPlay(expandDoubles(sequence));
      updateStatus(`Playing ${sequence.length} tokens`);
    } catch (err: any) {
      updateStatus(err?.message ?? "Invalid sequence");
    }
  };

  pause.onclick = () => cb.onPause();

  step.onclick = () => {
    try {
      const sequence = readSeq();
      const next = expandDoubles(sequence)[0];
      if (next) {
        cb.onStep(next);
      }
    } catch {
      /* noop */
    }
  };

  back.onclick = () => cb.onBack();

  clear.onclick = () => {
    cb.onClear();
    updateStatus("Cleared queue");
  };

  document.documentElement.style.setProperty("--speed-mult", speed.value);
  speed.oninput = () => document.documentElement.style.setProperty("--speed-mult", speed.value);
}
