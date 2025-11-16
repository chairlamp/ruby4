import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function ensureHudRoot(): HTMLElement {
  let el = document.getElementById("hud-root") as HTMLElement | null;
  if (!el) {
    el = document.createElement("div");
    el.id = "hud-root";
    document.body.appendChild(el);
  }
  return el;
}

export function HudPortal({ children }: { children: React.ReactNode }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => setRoot(ensureHudRoot()), []);
  if (!root) return null;
  return createPortal(children, root);
}
