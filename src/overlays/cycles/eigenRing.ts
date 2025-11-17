import { computeCycles48 } from "./cyclesUtil";
import { bucketByLength, rootsOfUnityAngles } from "../../core/eigens";

type GetPerm = () => Uint16Array;
type Hover = (indices: number[]) => void;

export interface EigenRingOptions {
  onHover?: Hover;
  size?: number;
  ringWidth?: number;
  tickLen?: number;
  showChrome?: boolean;
}

export function mountEigenRing(host: HTMLElement, getPerm: GetPerm, opts: EigenRingOptions = {}) {
  const size = opts.size ?? 180;
  const ringWidth = opts.ringWidth ?? 18;
  const tickLen = opts.tickLen ?? 8;
  const showChrome = opts.showChrome ?? true;

  host.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = showChrome ? "8px" : "0px";

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.style.display = "block";
  canvas.style.borderRadius = "6px";
  canvas.style.background = "#0b1220";
  canvas.style.border = "1px solid #334155";

  if (showChrome) {
    const title = document.createElement("div");
    title.textContent = "Eigen-ring";
    title.style.fontSize = "12px";
    title.style.opacity = "0.9";
    wrap.appendChild(title);
  }
  wrap.appendChild(canvas);
  if (showChrome) {
    const caption = document.createElement("div");
    caption.textContent = "Ticks at roots implied by cycle lengths. Hover to highlight.";
    caption.style.fontSize = "11px";
    caption.style.opacity = "0.7";
    wrap.appendChild(caption);
  }
  host.appendChild(wrap);

  const ctx = canvas.getContext("2d")!;
  let buckets = new Map<number, number[][]>();
  let hitRegions: { k: number; path: Path2D }[] = [];

  function compute() {
    const cycles = computeCycles48(getPerm());
    buckets = bucketByLength(cycles);
  }

  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.45;
    const inner = R - ringWidth;

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.arc(cx, cy, inner, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(34,197,94,0.30)";
    ctx.fill("evenodd");

    hitRegions = [];
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(187,247,208,0.95)";

    for (const [k] of buckets) {
      const angles = rootsOfUnityAngles(k);
      const tickPath = new Path2D();
      for (const a of angles) {
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const x0 = cx + cos * (inner - tickLen);
        const y0 = cy + sin * (inner - tickLen);
        const x1 = cx + cos * inner;
        const y1 = cy + sin * inner;
        tickPath.moveTo(x0, y0);
        tickPath.lineTo(x1, y1);
      }
      ctx.stroke(tickPath);

      const hit = new Path2D();
      for (const a of angles) {
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        const x0 = cx + cos * (inner - tickLen - 3);
        const y0 = cy + sin * (inner - tickLen - 3);
        const x1 = cx + cos * (inner + 3);
        const y1 = cy + sin * (inner + 3);
        hit.moveTo(x0, y0);
        hit.lineTo(x1, y1);
      }
      hitRegions.push({ k, path: hit });
    }
  }

  function refresh() {
    compute();
    draw();
  }

  canvas.onmousemove = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    let matchedK: number | null = null;
    for (const hr of hitRegions) {
      const isHit = "isPointInStroke" in ctx ? (ctx as any).isPointInStroke(hr.path, x, y) : ctx.isPointInPath(hr.path, x, y);
      if (isHit) {
        matchedK = hr.k;
        break;
      }
    }

    if (opts.onHover) {
      if (matchedK == null) {
        opts.onHover([]);
      } else {
        const cycles = buckets.get(matchedK) ?? [];
        const indices = cycles.flat();
        opts.onHover(indices);
      }
    }
  };

  canvas.onmouseleave = () => opts.onHover?.([]);

  refresh();

  return { refresh };
}
