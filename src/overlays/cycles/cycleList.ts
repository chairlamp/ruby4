import "./cycleList.css";
import { cyclesOf } from "../../core/cycles";
import type { Perm48 } from "../../core/perm";
import { descOf } from "../../core/indexing";

export interface CycleListOptions {
  includeFixed?: boolean;
  label?: "index" | "sticker" | "face";
  onHover?: (indices: number[]) => void;
}

function labelFor(i: number, mode: CycleListOptions["label"] = "face"): string {
  if (mode === "index") return `${i}`;
  if (mode === "sticker") return `${i + 1}`;
  const d = descOf(i);
  return `${d.face}(${d.i},${d.j})`;
}

export function mountCycleList(container: HTMLElement, getPerm: () => Perm48, opts?: CycleListOptions) {
  container.innerHTML = `<div id="cycle-list">
    <table><thead><tr>
      <th class="idx">#</th><th class="k">k</th><th>members</th>
    </tr></thead><tbody></tbody></table>
  </div>`;
  const tbody = container.querySelector("tbody") as HTMLTableSectionElement;

  function render() {
    const P = getPerm();
    const cycles = cyclesOf(P, { includeFixed: !!opts?.includeFixed });
    tbody.innerHTML = "";
    cycles.forEach((c, ci) => {
      const tr = document.createElement("tr");
      const tdIdx = document.createElement("td");
      tdIdx.className = "idx";
      tdIdx.textContent = String(ci + 1);
      const tdK = document.createElement("td");
      tdK.className = "k";
      tdK.textContent = String(c.length);
      const tdM = document.createElement("td");
      tdM.className = "members";
      tdM.textContent = c.members.map((m) => labelFor(m, opts?.label ?? "face")).join(", ");

      tr.appendChild(tdIdx);
      tr.appendChild(tdK);
      tr.appendChild(tdM);
      tr.addEventListener("mouseenter", () => opts?.onHover?.(c.members));
      tr.addEventListener("mouseleave", () => opts?.onHover?.([]));
      tbody.appendChild(tr);
    });
  }

  render();
  return { refresh: render };
}
