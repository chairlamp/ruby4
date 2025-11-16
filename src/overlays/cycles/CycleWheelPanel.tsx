import React from "react";
import { HudPortal } from "../../ui/HudPortal";

export function CycleWheelPanel() {
  return (
    <HudPortal>
      <section id="cycle-wheel-fixed" className="panel">
        <header className="panel__title">Cycle wheel</header>
        <div className="cycle-wheel">{/* existing wheel SVG/canvas content unchanged */}</div>
        <footer className="panel__caption">
          Arc size = cycle length k. Hover to highlight members.
        </footer>
      </section>
    </HudPortal>
  );
}
