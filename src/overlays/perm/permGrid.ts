import "./permGrid.css";
import { STATE_LEN, type Perm48 } from "../../core/perm";
import { descOf } from "../../core/indexing";

export interface PermGridOptions {
  size?: number; // canvas size in CSS px (square). default 320
  dotRadius?: number; // dot radius in px. default computed from cell size
  onHover?: (destIndex: number) => void; // call with -1 to clear
}

type Ctx = CanvasRenderingContext2D;

export function mountPermGrid(
  container: HTMLElement,
  getPerm: () => Perm48,
  opts?: PermGridOptions
) {
  const size = opts?.size ?? 320;
  const cell = size / STATE_LEN;
  const dotR = opts?.dotRadius ?? Math.max(1.5, 0.35 * cell);

  const root = document.createElement("div");
  root.id = "perm-grid";
  root.innerHTML = `<div class="title">Permutation grid (48×48)</div>`;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size * devicePixelRatio;
  canvas.style.width = canvas.style.height = `${size}px`;
  const ctx = canvas.getContext("2d") as Ctx;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  root.appendChild(canvas);
  const legend = document.createElement("div");
  legend.className = "legend";
  legend.textContent = "Hover dot = sticker i → P[i]";
  root.appendChild(legend);
  container.appendChild(root);

  function drawGridLines() {
    ctx.save();
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 1;
    ctx.beginPath();
    // sparse grid every 6 cells (rough face grouping cue)
    for (let k = 0; k <= STATE_LEN; k += 6) {
      const x = k * cell + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.moveTo(0, x);
      ctx.lineTo(size, x);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawDots(P: Perm48, hoverI = -1) {
    // clear
    ctx.clearRect(0, 0, size, size);
    // bg
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, size, size);
    drawGridLines();

    // dots
    ctx.save();
    for (let i = 0; i < STATE_LEN; i++) {
      const j = P[i];
      const cx = (j + 0.5) * cell;
      const cy = (i + 0.5) * cell;

      const isHover = i === hoverI;
      ctx.beginPath();
      ctx.arc(cx, cy, isHover ? dotR * 1.4 : dotR, 0, Math.PI * 2);
      ctx.fillStyle = isHover ? "#ffd166" : "#60a5fa";
      ctx.fill();
    }
    ctx.restore();
  }

  function render(hoverI = -1) {
    const P = getPerm();
    drawDots(P, hoverI);
  }

  let lastHover = -1;

  function eventToIndex(evt: MouseEvent): number {
    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    const i = Math.floor(y / cell);
    const j = Math.floor(x / cell);
    if (i < 0 || i >= STATE_LEN || j < 0 || j >= STATE_LEN) return -1;
    // only treat it as a dot hit if j === P[i] (snap to nearest row dot)
    const P = getPerm();
    return P[i] === j ? i : -1;
  }

  canvas.addEventListener("mousemove", (e) => {
    const i = eventToIndex(e);
    if (i !== lastHover) {
      lastHover = i;
      render(i);
      opts?.onHover?.(i);
      if (i >= 0) {
        const d = descOf(i);
        canvas.title = `row i=${i} (${d.face}(${d.i},${d.j})) → col P[i]=${getPerm()[i]}`;
      } else {
        canvas.title = "";
      }
    }
  });
  canvas.addEventListener("mouseleave", () => {
    lastHover = -1;
    render(-1);
    opts?.onHover?.(-1);
    canvas.title = "";
  });

  // initial paint
  render();

  return {
    refresh: () => render(lastHover),
  };
}
