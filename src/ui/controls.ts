import { parseMoves, formatMoves, type MoveToken } from "./moveParser";

type Handlers = {
  onApply?: (tokens: MoveToken[]) => void;
  onReset?: () => void;
};

const MOVE_ROWS = [
  ["U", "D", "L", "R", "F", "B"],
  ["U'", "D'", "L'", "R'", "F'", "B'"],
  ["U2", "D2", "L2", "R2", "F2", "B2"],
];

export function mountMoveUI(handlers: Handlers = {}): {
  getText: () => string;
  setText: (s: string) => void;
  destroy: () => void;
} {
  const host = document.getElementById("app") || document.body;
  const root = document.createElement("div");
  root.setAttribute("data-tour", "moves");
  root.className = "moves-pad";
  root.innerHTML = `
    <div class="moves-card">
      <div class="moves-head">
        <input id="moveInput" class="moves-input" data-role="moves-input"
          placeholder="D2 L2 R2 F2" spellcheck="false" />
        <div class="moves-actions">
          <button type="button" data-btn="clear">Clear</button>
          <button type="button" data-btn="copy">Copy</button>
        </div>
      </div>
      <div id="parseStatus" class="moves-status"></div>
      <div class="moves-grid">
        ${MOVE_ROWS.map(
          (row) => `
          <div class="moves-row">
            ${row.map((m) => `<button type="button" data-move="${m}">${m}</button>`).join("")}
          </div>`
        ).join("")}
      </div>
    </div>
  `;
  host.appendChild(root);

  const input = root.querySelector<HTMLInputElement>("#moveInput")!;
  const status = root.querySelector<HTMLDivElement>("#parseStatus")!;
  const clearBtn = root.querySelector<HTMLButtonElement>('[data-btn="clear"]')!;
  const copyBtn = root.querySelector<HTMLButtonElement>('[data-btn="copy"]')!;

  let text = "";
  let appliedTokens: MoveToken[] = [];
  let appliedSig = "";

  function syncInput() {
    input.value = text;
  }

  function applyFromText(nextText: string) {
    text = nextText;
    syncInput();
    const trimmed = text.trim();
    if (!trimmed) {
      if (appliedTokens.length) {
        handlers.onReset?.();
        appliedTokens = [];
        appliedSig = "";
        status.textContent = "";
      }
      return;
    }
    let tokens: MoveToken[];
    try {
      tokens = parseMoves(trimmed);
    } catch (err: any) {
      status.textContent = err?.message || "Parse error.";
      return;
    }
    const sig = formatMoves(tokens);
    if (sig === appliedSig) return;

    let common = 0;
    while (common < tokens.length && common < appliedTokens.length) {
      const a = tokens[common];
      const b = appliedTokens[common];
      if (a.face === b.face && a.power === b.power && a.prime === b.prime) common++;
      else break;
    }

    if (common < appliedTokens.length) {
      handlers.onReset?.();
      if (tokens.length) handlers.onApply?.(tokens);
    } else {
      const delta = tokens.slice(common);
      if (delta.length) handlers.onApply?.(delta);
    }

    appliedTokens = tokens;
    appliedSig = sig;
    status.textContent = `Moves: ${tokens.length}`;
  }

  function appendMove(move: string) {
    const next = text ? `${text} ${move}` : move;
    applyFromText(next);
  }

  function modifyLast(mod: "'" | "2") {
    const trimmed = text.trim();
    if (!trimmed) return;
    let tokens: MoveToken[];
    try {
      tokens = parseMoves(trimmed);
    } catch {
      return;
    }
    if (!tokens.length) return;
    const last = tokens[tokens.length - 1];
    if (mod === "'") last.prime = true;
    else last.power = 2;
    applyFromText(formatMoves(tokens));
  }

  function clearAll() {
    text = "";
    appliedTokens = [];
    appliedSig = "";
    syncInput();
    status.textContent = "";
    handlers.onReset?.();
  }

  function copyAll() {
    const value = text.trim();
    if (value && navigator.clipboard) navigator.clipboard.writeText(value).catch(() => {});
  }

  root.querySelectorAll<HTMLButtonElement>("[data-move]").forEach((btn) => {
    btn.addEventListener("click", () => appendMove(btn.dataset.move!));
  });
  clearBtn.addEventListener("click", clearAll);
  copyBtn.addEventListener("click", copyAll);

  input.addEventListener("input", () => {
    applyFromText(input.value);
  });

  function onKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    const isTyping =
      target &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
    if (isTyping && target !== input) return;

    const k = e.key;
    if (/^[udlrfb]$/i.test(k)) {
      appendMove(k.toUpperCase());
      return;
    }
    if (k === "'" || k === "′") {
      modifyLast("'");
      return;
    }
    if (k === "2") {
      modifyLast("2");
      return;
    }
    if (k === "Backspace") {
      e.preventDefault();
      applyFromText(text.slice(0, -1));
    }
  }

  window.addEventListener("keydown", onKey);
  syncInput();

  return {
    getText: () => text.trim(),
    setText: (s: string) => {
      applyFromText(s.trim());
    },
    destroy: () => {
      window.removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}
