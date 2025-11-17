import "./cycleWheel.css";
import type { Perm48 } from "../../core/perm";

export interface CycleWheelOptions {
  size?: number; // canvas square size in CSS px, default 220
  radius?: number; // ring radius (center to midline), default size*0.36
  ringWidth?: number; // stroke width in px, default 14
  showLabels?: boolean; // draw 'k' at mid-arc, default true
  showChrome?: boolean; // show title + legend, default true
  onHover?: (indices: number[] | null) => void; // null = clear
}

type Ctx = CanvasRenderingContext2D;

type Arc = {
  start: number;
  end: number;
  k: number;
  indices: number[];
};

function computeCycles(P: Perm48): number[][] {
  const n = P.length;
  const seen = new Uint8Array(n);
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    if (seen[i]) continue;
    const cyc: number[] = [];
    let j = i;
    while (!seen[j]) {
      seen[j] = 1;
      cyc.push(j);
      j = P[j];
    }
    out.push(cyc);
  }
  // sort longest first for nicer separation
  out.sort((a, b) => b.length - a.length);
  return out;
}

function normAngle(a: number): number {
  const t = a % (Math.PI * 2);
  return t < 0 ? t + Math.PI * 2 : t;
}
function angleInArc(theta: number, start: number, end: number): boolean {
  theta = normAngle(theta);
  start = normAngle(start);
  end = normAngle(end);
  if (end < start) end += Math.PI * 2; // wrap
  if (theta < start) theta += Math.PI * 2;
  return theta >= start && theta <= end;
}

export function mountCycleWheel(
  container: HTMLElement,
  getPerm: () => Perm48,
  opts?: CycleWheelOptions
) {
  const size = opts?.size ?? 220;
  const radius = opts?.radius ?? size * 0.36;
  const ringWidth = opts?.ringWidth ?? 14;
  const showLabels = opts?.showLabels ?? true;
  const showChrome = opts?.showChrome ?? true;

  const root = document.createElement("div");
  root.id = "cycle-wheel";
  container.appendChild(root);
  if (showChrome) {
    const title = document.createElement("div");
    title.className = "title";
    title.textContent = "Cycle wheel";
    root.appendChild(title);
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size * devicePixelRatio;
  canvas.style.width = canvas.style.height = `${size}px`;
  const ctx = canvas.getContext("2d") as Ctx;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  root.appendChild(canvas);
  if (showChrome) {
    const legend = document.createElement("div");
    legend.className = "legend";
    legend.textContent = "Arc size ~ cycle length k. Hover to highlight members.";
    root.appendChild(legend);
  }

  let arcs: Arc[] = [];
  let hoverArcIdx = -1;
  let lockArcIdx = -1;

  function layoutArcs(P: Perm48) {
    const cycles = computeCycles(P);
    const total = P.length; // 48
    const arcsOut: Arc[] = [];
    let theta = -Math.PI / 2; // start at top
    for (const c of cycles) {
      const span = 2 * Math.PI * (c.length / total);
      arcsOut.push({ start: theta, end: theta + span, k: c.length, indices: c });
      theta += span;
    }
    arcs = arcsOut;
  }

  function clear() {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, size, size);
  }

  function draw() {
    clear();
    ctx.save();
    ctx.translate(size / 2, size / 2);

    // base ring
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.lineWidth = ringWidth;
    ctx.strokeStyle = "#1f2937";
    ctx.stroke();

    // arcs
    arcs.forEach((arc, idx) => {
      const isHover = idx === hoverArcIdx || idx === lockArcIdx;
      ctx.beginPath();
      ctx.arc(0, 0, radius, arc.start, arc.end);
      ctx.lineWidth = ringWidth;
      ctx.lineCap = "butt";
      ctx.strokeStyle = isHover ? "#ffd166" : "#60a5fa";
      ctx.globalAlpha = isHover ? 1 : 0.9;
      ctx.stroke();

      if (showLabels) {
        const mid = (arc.start + arc.end) / 2;
        const rText = radius - ringWidth * 0.75;
        ctx.save();
        ctx.translate(Math.cos(mid) * rText, Math.sin(mid) * rText);
        ctx.rotate(mid + Math.PI / 2);
        ctx.fillStyle = "#e6e6e6";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillText(String(arc.k), 0, 0);
        ctx.restore();
      }
    });

    // center
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, ringWidth * 0.25), 0, Math.PI * 2);
    ctx.fillStyle = "#94a3b8";
    ctx.fill();

    ctx.restore();
  }

  function hitTest(ev: MouseEvent): number {
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left - size / 2;
    const y = ev.clientY - rect.top - size / 2;
    const r = Math.sqrt(x * x + y * y);
    const theta = Math.atan2(y, x);
    // Check radial band first
    const inner = radius - ringWidth / 2;
    const outer = radius + ringWidth / 2;
    if (r < inner || r > outer) return -1;

    // Find arc containing angle
    for (let i = 0; i < arcs.length; i++) {
      const a = arcs[i];
      if (angleInArc(theta, a.start, a.end)) return i;
    }
    return -1;
  }

  canvas.addEventListener("mousemove", (e) => {
    const idx = lockArcIdx >= 0 ? lockArcIdx : hitTest(e);
    if (idx !== hoverArcIdx) {
      hoverArcIdx = idx;
      draw();
      opts?.onHover?.(idx >= 0 ? arcs[idx].indices : null);
      if (idx >= 0) {
        const { k, indices } = arcs[idx];
        canvas.title = `k = ${k}  -  members: [${indices.join(", ")}]`;
      } else {
        canvas.title = "";
      }
    }
  });

  canvas.addEventListener("mouseleave", () => {
    hoverArcIdx = -1;
    if (lockArcIdx < 0) opts?.onHover?.(null);
    draw();
  });

  canvas.addEventListener("click", (e) => {
    const idx = hitTest(e);
    lockArcIdx = lockArcIdx === idx ? -1 : idx;
    if (lockArcIdx >= 0) {
      opts?.onHover?.(arcs[lockArcIdx].indices);
    } else {
      opts?.onHover?.(null);
    }
    draw();
  });

  function refresh() {
    const P = getPerm();
    layoutArcs(P);
    // if the locked cycle no longer exists (e.g., new permutation), clear it
    if (lockArcIdx >= 0 && lockArcIdx >= arcs.length) {
      lockArcIdx = -1;
      opts?.onHover?.(null);
    }
    draw();
  }

  // initial
  refresh();

  return { refresh };
}
