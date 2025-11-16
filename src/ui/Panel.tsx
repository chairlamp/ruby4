import React from "react";

type Slot = "tl" | "tr" | "bl" | "br";

type PanelProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** Optional viewport slot. When provided, the panel is position:fixed. */
  slot?: Slot;
  footer?: React.ReactNode;
};

export function Panel({ title, children, className, id, slot, footer }: PanelProps) {
  const slotClass = slot ? `panel--slot panel--${slot}` : "";
  return (
    <section id={id} className={`panel ${slotClass} ${className ?? ""}`}>
      <header className="panel__title">{title}</header>
      <div className="panel__body">{children}</div>
      {footer ? <footer className="panel__footer">{footer}</footer> : null}
    </section>
  );
}
