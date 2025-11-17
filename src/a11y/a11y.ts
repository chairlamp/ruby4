export interface A11yHooks {
  setCanvasFilter?: (cssFilter: string) => void;
  setTrailLength?: (points: number) => void;
  setTurnDurationMs?: (ms: number) => void;
  setUiClass?: (cls: string, on: boolean) => void;
  setBadge?: (text: string) => void;
}

export interface A11yOptions {
  hooks?: A11yHooks;
  normalTurnMs?: number;
  reducedTurnMs?: number;
}

export class A11yManager {
  private hooks: A11yHooks;
  private highContrast = false;
  private reducedMotion = false;
  private normalTurnMs: number;
  private reducedTurnMs: number;

  constructor(opts: A11yOptions = {}) {
    this.hooks = opts.hooks ?? {};
    this.normalTurnMs = opts.normalTurnMs ?? 200;
    this.reducedTurnMs = opts.reducedTurnMs ?? 350;

    const mqMotion = safeMQ("(prefers-reduced-motion: reduce)");
    const mqContrast = safeMQ("(prefers-contrast: more)");

    const q = new URLSearchParams(window.location.search);
    const qA11y = q.get("a11y");
    const storedRM = readBool(localStorage.getItem("a11y.rm"));
    const storedHC = readBool(localStorage.getItem("a11y.hc"));

    this.reducedMotion =
      qA11y === "rm" || qA11y === "both"
        ? true
        : qA11y === "off" || qA11y === "hc"
        ? false
        : storedRM ?? !!mqMotion?.matches;

    this.highContrast =
      qA11y === "hc" || qA11y === "both"
        ? true
        : qA11y === "off" || qA11y === "rm"
        ? false
        : storedHC ?? !!mqContrast?.matches;

    this.applyAll(true);

    mqMotion?.addEventListener?.("change", (e) => {
      if (hasManualOverride("a11y.rm")) return;
      this.setReducedMotion(e.matches);
    });
    mqContrast?.addEventListener?.("change", (e) => {
      if (hasManualOverride("a11y.hc")) return;
      this.setHighContrast(e.matches);
    });

    window.addEventListener("keydown", (ev) => {
      if (!ev.altKey || !ev.shiftKey) return;
      if (ev.code === "KeyM") this.forceReducedMotion(!this.reducedMotion);
      else if (ev.code === "KeyH") this.forceHighContrast(!this.highContrast);
    });

    (window as any).setReducedMotion = (on: boolean | null) => this.forceReducedMotion(on);
    (window as any).setHighContrast = (on: boolean | null) => this.forceHighContrast(on);
  }

  get isReducedMotion() {
    return this.reducedMotion;
  }
  get isHighContrast() {
    return this.highContrast;
  }

  private applyAll(initial = false) {
    this.hooks.setTurnDurationMs?.(this.reducedMotion ? this.reducedTurnMs : this.normalTurnMs);
    this.hooks.setTrailLength?.(this.reducedMotion ? 24 : 72);

    const filter = this.highContrast ? "contrast(1.25) saturate(1.15) brightness(1.05)" : "";
    this.hooks.setCanvasFilter?.(filter);
    this.hooks.setUiClass?.("a11y-hc", this.highContrast);

    this.hooks.setBadge?.(this.badgeText(initial));
  }

  private badgeText(initial = false): string {
    const rm = this.reducedMotion ? "rm:on" : "rm:off";
    const hc = this.highContrast ? "hc:on" : "hc:off";
    return `A11y ${initial ? "(init) " : ""}· ${rm} · ${hc}`;
  }

  setReducedMotion(on: boolean) {
    this.reducedMotion = !!on;
    this.applyAll();
  }

  setHighContrast(on: boolean) {
    this.highContrast = !!on;
    this.applyAll();
  }

  forceReducedMotion(on: boolean | null) {
    if (on === null) localStorage.removeItem("a11y.rm");
    else localStorage.setItem("a11y.rm", on ? "1" : "0");
    if (on === null) {
      const mqMotion = safeMQ("(prefers-reduced-motion: reduce)");
      this.setReducedMotion(!!mqMotion?.matches);
    } else {
      this.setReducedMotion(on);
    }
  }

  forceHighContrast(on: boolean | null) {
    if (on === null) localStorage.removeItem("a11y.hc");
    else localStorage.setItem("a11y.hc", on ? "1" : "0");
    if (on === null) {
      const mqContrast = safeMQ("(prefers-contrast: more)");
      this.setHighContrast(!!mqContrast?.matches);
    } else {
      this.setHighContrast(on);
    }
  }
}

function safeMQ(query: string): MediaQueryList | null {
  try {
    return window.matchMedia ? window.matchMedia(query) : null;
  } catch {
    return null;
  }
}

function readBool(v: string | null): boolean | null {
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return null;
}

function hasManualOverride(key: "a11y.rm" | "a11y.hc"): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === "0" || v === "1" || v === "true" || v === "false";
  } catch {
    return false;
  }
}
