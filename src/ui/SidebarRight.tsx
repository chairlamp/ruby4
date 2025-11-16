import React from "react";
import { CycleListPanel } from "../overlays/cycles/CycleListPanel";

export function SidebarRight() {
  return (
    <aside className="sidebar sidebar--right">
      <CycleListPanel />
    </aside>
  );
}
