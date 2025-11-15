import type { Perm } from "../core/types";
import { cyclesOf } from "../core/cycles";
import { stickerAtIndex } from "../core/moves";

export function mountCyclesPanel(root: HTMLElement) {
  const el = document.createElement("div");
  el.className = "cycles-panel";
  el.innerHTML = `<div class="title">Cycles</div><div class="body"></div>`;
  root.appendChild(el);
  const body = el.querySelector(".body") as HTMLDivElement;
  return {
    render(P: Perm) {
      const cs = cyclesOf(P, true);
      const rows = cs
        .sort((a, b) => b.length - a.length)
        .map((cyc, i) => {
          const label = cyc.length === 1 ? "fixed" : `${cyc.length}-cycle`;
          const members = cyc
            .map((k) => {
              const s = stickerAtIndex(k);
              return `${s.face}[${s.r},${s.c}]`;
            })
            .join(" · ");
          return `<div class="row"><span class="idx">${i + 1}.</span><span class="len">${label}</span><span class="members">${members}</span></div>`;
        })
        .join("");
      body.innerHTML = rows || "<div class='row'>No cycles</div>";
    },
  };
}
