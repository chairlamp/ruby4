const TOKENS = [
  "U",
  "D",
  "L",
  "R",
  "F",
  "B",
  "U'",
  "D'",
  "L'",
  "R'",
  "F'",
  "B'",
  "U2",
  "D2",
  "L2",
  "R2",
  "F2",
  "B2",
];

const TOKEN_PATTERN = /^[UDLRFB](?:['2])?$/;

let sequenceInput: HTMLInputElement | null = null;
let keyboardListener: ((event: KeyboardEvent) => void) | null = null;
let pendingToken = "";
let moveHandler: ((token: string) => void) | null = null;

function appendTokenToInput(token: string) {
  if (!sequenceInput) return;
  const trimmed = sequenceInput.value.trim();
  const prefix = trimmed.length > 0 ? `${trimmed} ` : "";
  sequenceInput.value = `${prefix}${token} `;
  sequenceInput.focus();
}

function emitToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) {
    return;
  }
  appendTokenToInput(token);
  moveHandler?.(token);
  window.dispatchEvent(new CustomEvent("moveInput", { detail: token }));
}

function setupKeyboard() {
  if (keyboardListener) {
    window.removeEventListener("keydown", keyboardListener);
  }

  keyboardListener = (event: KeyboardEvent) => {
    if (!sequenceInput) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (
      target &&
      target !== document.body &&
      target !== sequenceInput
    ) {
      return;
    }

    const key = event.key;

    if (key === " " || key === "Enter") {
      if (pendingToken) {
        event.preventDefault();
        emitToken(pendingToken);
        pendingToken = "";
      }
      return;
    }

    if (key === "Backspace") {
      if (pendingToken) {
        event.preventDefault();
        pendingToken = "";
      }
      return;
    }

    if (key === "'") {
      if (pendingToken.length === 1) {
        event.preventDefault();
        pendingToken = `${pendingToken}'`;
      }
      return;
    }

    if (key === "2" && pendingToken.length === 1) {
      event.preventDefault();
      pendingToken = `${pendingToken}2`;
      return;
    }

    if (key.length === 1) {
      const upper = key.toUpperCase();
      if ("UDLRFB".includes(upper)) {
        event.preventDefault();
        pendingToken = upper;
      }
    }
  };

  window.addEventListener("keydown", keyboardListener);
}

function createSequenceInput(): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Type moves e.g. R U F ...";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.className = "keypad-input";
  return input;
}

function createActionButtons(input: HTMLInputElement) {
  const actions = document.createElement("div");
  actions.className = "keypad-actions";

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.textContent = "Clear";
  clearButton.addEventListener("click", () => {
    input.value = "";
    input.focus();
  });

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = "Copy Sequence";
  copyButton.addEventListener("click", async () => {
    const text = input.value;
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // fall through to execCommand
      }
    }
    input.select();
    document.execCommand("copy");
    input.setSelectionRange(input.value.length, input.value.length);
  });

  actions.appendChild(clearButton);
  actions.appendChild(copyButton);
  return actions;
}

export function mountKeypad(root: HTMLElement, onMove: (token: string) => void): void {
  moveHandler = onMove;

  root.innerHTML = "";
  root.classList.add("keypad-container");

  const wrapper = document.createElement("div");
  wrapper.className = "keypad-panel";

  const input = createSequenceInput();
  sequenceInput = input;

  const keypad = document.createElement("div");
  keypad.className = "keypad";

  TOKENS.forEach((token) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = token;
    button.addEventListener("click", () => {
      emitToken(token);
    });
    keypad.appendChild(button);
  });

  wrapper.appendChild(input);
  wrapper.appendChild(keypad);
  wrapper.appendChild(createActionButtons(input));
  root.appendChild(wrapper);

  setupKeyboard();
}

export function getSequence(): string {
  return sequenceInput?.value ?? "";
}
