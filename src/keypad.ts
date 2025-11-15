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

let inputEl: HTMLInputElement | null = null;

function createInput(): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Type moves e.g. R U F ...";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.className = "keypad-input";
  return input;
}

function appendTokenToInput(token: string) {
  if (!inputEl) return;
  const value = inputEl.value.trim();
  inputEl.value = value ? `${value} ${token}` : `${token}`;
}

function createActions(): HTMLDivElement {
  const actions = document.createElement("div");
  actions.className = "keypad-actions";

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.textContent = "Clear";
  clearButton.addEventListener("click", () => {
    if (inputEl) {
      inputEl.value = "";
      inputEl.focus();
    }
  });

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = "Copy";
  copyButton.addEventListener("click", async () => {
    if (!inputEl) return;
    const value = inputEl.value;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      inputEl.select();
      document.execCommand("copy");
      inputEl.setSelectionRange(value.length, value.length);
    }
  });

  actions.append(clearButton, copyButton);
  return actions;
}

export function mountKeypad(root: HTMLElement, onMove: (token: string) => void): void {
  root.innerHTML = "";
  root.classList.add("keypad-container");

  const panel = document.createElement("div");
  panel.className = "keypad-panel";

  inputEl = createInput();
  panel.appendChild(inputEl);

  const keypad = document.createElement("div");
  keypad.className = "keypad";

  TOKENS.forEach((token) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = token;
    button.addEventListener("click", () => {
      appendTokenToInput(token);
      onMove(token);
      window.dispatchEvent(new CustomEvent("moveInput", { detail: token }));
    });
    keypad.appendChild(button);
  });

  panel.appendChild(keypad);
  panel.appendChild(createActions());
  root.appendChild(panel);
}

export function getSequence(): string {
  return inputEl?.value ?? "";
}
