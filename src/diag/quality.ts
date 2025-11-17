export type QualityTier = "ultra" | "high" | "medium" | "lite";

export interface QualityHooks {
  setPixelRatio?: (ratio: number) => void;
  setTrailLength?: (points: number) => void;
  setBloomEnabled?: (enabled: boolean) => void;
  setShadowsEnabled?: (enabled: boolean) => void;
  setBadge?: (text: string) => void;
}

export interface QualityManagerOpts {
  hooks?: QualityHooks;
  targetFps?: number;
  emaAlpha?: number;
  downgradeFps?: number;
  upgradeFps?: number;
  framesToDowngrade?: number;
  framesToUpgrade?: number;
  honorReducedMotion?: boolean;
}

export class QualityManager {
  readonly hooks: QualityHooks;
  readonly targetFps: number;
  readonly emaAlpha: number;
  readonly downgradeFps: number;
  readonly upgradeFps: number;
  readonly framesToDowngrade: number;
  readonly framesToUpgrade: number;
  readonly honorReducedMotion: boolean;

  private _tier: QualityTier = "high";
  private _forced: QualityTier | null = null;
  private _emaFps = 60;
  private _downHold = 0;
  private _upHold = 0;
  private _attached = false;

  constructor(opts: QualityManagerOpts = {}) {
    this.hooks = opts.hooks ?? {};
    this.targetFps = opts.targetFps ?? 60;
    this.emaAlpha = opts.emaAlpha ?? 0.12;
    this.downgradeFps = opts.downgradeFps ?? 50;
    this.upgradeFps = opts.upgradeFps ?? 58;
    this.framesToDowngrade = opts.framesToDowngrade ?? 120;
    this.framesToUpgrade = opts.framesToUpgrade ?? 300;
    this.honorReducedMotion = opts.honorReducedMotion ?? true;

    const q = new URLSearchParams(window.location.search).get("quality");
    const stored = (window.localStorage?.getItem("quality") as QualityTier | null) ?? null;
    const prefersLite =
      this.honorReducedMotion &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (q && isTier(q)) this._forced = q;
    else if (stored && isTier(stored)) this._forced = stored;
    else if (prefersLite) this._forced = "lite";

    this.applyTier(this.currentTier(), true);
  }

  attach() {
    if (this._attached) return;
    this._attached = true;
  }

  detach() {
    this._attached = false;
  }

  tick(dtMs: number) {
    if (!this._attached) return;
    const instFps = dtMs > 0 ? 1000 / dtMs : this.targetFps;
    this._emaFps = this.emaAlpha * instFps + (1 - this.emaAlpha) * this._emaFps;

    if (this._forced) {
      this.hooks.setBadge?.(badgeText(this._forced, true, this._emaFps));
      return;
    }

    if (this._emaFps < this.downgradeFps) {
      this._downHold++;
      this._upHold = 0;
      if (this._downHold >= this.framesToDowngrade) {
        this.downgrade();
        this._downHold = 0;
      }
    } else if (this._emaFps > this.upgradeFps) {
      this._upHold++;
      this._downHold = 0;
      if (this._upHold >= this.framesToUpgrade) {
        this.upgrade();
        this._upHold = 0;
      }
    } else {
      this._downHold = Math.max(0, this._downHold - 1);
      this._upHold = Math.max(0, this._upHold - 1);
    }

    this.hooks.setBadge?.(badgeText(this._tier, false, this._emaFps));
  }

  force(tier: QualityTier | null) {
    this._forced = tier;
    if (tier) {
      this.applyTier(tier);
      try {
        window.localStorage?.setItem("quality", tier);
      } catch {}
    } else {
      try {
        window.localStorage?.removeItem("quality");
      } catch {}
      this.applyTier(this._tier);
    }
  }

  currentTier(): QualityTier {
    return this._forced ?? this._tier;
  }

  private upgrade() {
    const next = stepUp(this._tier);
    if (next !== this._tier) {
      this._tier = next;
      this.applyTier(this._tier);
    }
  }

  private downgrade() {
    const next = stepDown(this._tier);
    if (next !== this._tier) {
      this._tier = next;
      this.applyTier(this._tier);
    }
  }

  private applyTier(tier: QualityTier, initial = false) {
    const wantPixelRatio =
      tier === "ultra"
        ? Math.min(window.devicePixelRatio, 2)
        : tier === "high"
        ? Math.min(window.devicePixelRatio, 1.5)
        : tier === "medium"
        ? Math.min(window.devicePixelRatio, 1.25)
        : Math.min(window.devicePixelRatio, 1);

    this.hooks.setPixelRatio?.(wantPixelRatio);
    this.hooks.setBloomEnabled?.(tier !== "lite");
    this.hooks.setShadowsEnabled?.(tier !== "lite");
    this.hooks.setTrailLength?.(tier === "lite" ? 24 : tier === "medium" ? 48 : 72);
    this.hooks.setBadge?.(badgeText(tier, this._forced !== null, this._emaFps, initial));
  }
}

function isTier(x: string): x is QualityTier {
  return x === "ultra" || x === "high" || x === "medium" || x === "lite";
}

function stepDown(t: QualityTier): QualityTier {
  if (t === "ultra") return "high";
  if (t === "high") return "medium";
  if (t === "medium") return "lite";
  return "lite";
}

function stepUp(t: QualityTier): QualityTier {
  if (t === "lite") return "medium";
  if (t === "medium") return "high";
  if (t === "high") return "ultra";
  return "ultra";
}

function badgeText(t: QualityTier, forced: boolean, fps: number, initial = false): string {
  const f = Math.round(fps);
  const mode = forced ? "manual" : "auto";
  return `Quality: ${t} · ${mode}${initial ? " · init" : ""} · ~${f} FPS`;
}
