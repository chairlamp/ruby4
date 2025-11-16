import * as THREE from "three";
import { BASIS, FACE_LOCAL_COORDS, FACE_ORDER, idOf, descOf, toGlobal, type Face } from "../core/indexing";
import { compose48, identity48, type Perm48 } from "../core/perm";
import { quarter as permQuarter, prime as permPrime, double as permDouble } from "../core/moves";

const CELL = 1;
const GUTTER = 0.1;
const HALF = (3 * CELL) / 2;
const EPS = 0.012;
const STICKER_THICK = 0.02;

const FACE_COLORS: Record<Face, number> = {
  U: 0xffffff,
  D: 0xffd500,
  F: 0x009b48,
  B: 0x0046ad,
  R: 0xb71234,
  L: 0xff5800,
};

type MoveToken = { face: Face; power: 1 | 2; prime: boolean };

function colorForSticker(srcIndex: number): number {
  const { face } = descOf(srcIndex);
  return FACE_COLORS[face];
}

function axisFromFace(face: Face): THREE.Vector3 {
  const n = BASIS[face].n;
  return new THREE.Vector3(n.x, n.y, n.z);
}

function pivotFromFace(face: Face): THREE.Vector3 {
  const n = BASIS[face].n;
  return new THREE.Vector3(n.x * (HALF + EPS), n.y * (HALF + EPS), n.z * (HALF + EPS));
}

function onLayer(destIndex: number, face: Face): boolean {
  const p = toGlobal(...Object.values(descOf(destIndex)) as [Face, number, number]);
  const n = BASIS[face].n;
  return (n.x !== 0 && p.x === n.x) || (n.y !== 0 && p.y === n.y) || (n.z !== 0 && p.z === n.z);
}

/** Build world matrix for any (face,i,j) cell (works for centers with i=j=0). */
function matrixFor(face: Face, i: number, j: number): THREE.Matrix4 {
  const u = new THREE.Vector3(BASIS[face].u.x, BASIS[face].u.y, BASIS[face].u.z);
  const v = new THREE.Vector3(BASIS[face].v.x, BASIS[face].v.y, BASIS[face].v.z);
  const n = new THREE.Vector3(BASIS[face].n.x, BASIS[face].n.y, BASIS[face].n.z);

  const basis = new THREE.Matrix4().makeBasis(u, v, n);
  const quat = new THREE.Quaternion().setFromRotationMatrix(basis);

  const pos = n.clone().multiplyScalar(HALF + EPS)
    .add(u.clone().multiplyScalar(i * CELL))
    .add(v.clone().multiplyScalar(j * CELL));

  const s = CELL - GUTTER;
  const scale = new THREE.Vector3(s, s, STICKER_THICK);

  const m = new THREE.Matrix4();
  m.compose(pos, quat, scale);
  return m;
}

/** 48-slot solved matrix (non-center) */
function solvedMatrixFor(destIndex: number): THREE.Matrix4 {
  const { face, i, j } = descOf(destIndex);
  return matrixFor(face, i, j);
}

export class StickerSystem {
  onStateChanged?: () => void;
  /** dest→src mapping (which original sticker sits at each slot) */
  private state: Uint16Array = identity48();
  /** Solved-slot matrices (world) */
  private slotMats: THREE.Matrix4[] = Array.from({ length: 48 }, (_, d) => solvedMatrixFor(d));

  /** Moving stickers (48) */
  readonly base: THREE.InstancedMesh;
  /** Face centers (6) — fixed, not animated by permutations */
  readonly centers: THREE.InstancedMesh;

  /** Overlay for an active turn (rotates as a group) */
  private overlayGroup: THREE.Group | null = null;
  private overlay: THREE.InstancedMesh | null = null;
  private hidden: number[] = []; // dest indices hidden in base during turn

  /** Animation queue */
  private queue: Array<{ face: Face; power: 1 | 2; prime: boolean }> = [];
  private active: null | {
    face: Face;
    perm: Perm48;
    durationMs: number;
    elapsedMs: number;
    targetAngle: number;
    axis: THREE.Vector3;
    pivot: THREE.Vector3;
    movers: number[];
  } = null;

  readonly root = new THREE.Group();

  private highlight: THREE.InstancedMesh;

  constructor() {
    // Shared geometry
    const geom = new THREE.PlaneGeometry(1, 1);

    // Provide per-vertex color = 1 so vertexColors never zero out instanceColor
    {
      const vcount = geom.getAttribute("position").count;
      const ones = new Float32Array(vcount * 3);
      for (let i = 0; i < ones.length; i++) ones[i] = 1.0;
      geom.setAttribute("color", new THREE.BufferAttribute(ones, 3));
    }

    // Material
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.4,
      metalness: 0.0,
      vertexColors: true,
      side: THREE.FrontSide
    });
    mat.emissiveIntensity = 0.35;

    // ----- 48 moving stickers -----
    this.base = new THREE.InstancedMesh(geom, mat, 48);
    this.base.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (!(this.base as any).instanceColor) {
      (this.base as any).instanceColor =
        new THREE.InstancedBufferAttribute(new Float32Array(48 * 3), 3);
    }
    for (let d = 0; d < 48; d++) this.base.setMatrixAt(d, this.slotMats[d]);
    this.base.instanceMatrix.needsUpdate = true;
    this.root.add(this.base);

    const hlMat = new THREE.MeshBasicMaterial({
      color: 0xffff66,
      transparent: true,
      opacity: 0.6,
      depthTest: false
    });
    this.highlight = new THREE.InstancedMesh(geom, hlMat, 48);
    this.highlight.count = 0;
    this.root.add(this.highlight);

    // ----- 6 centers (fixed) -----
    const centersMat = mat.clone();
    this.centers = new THREE.InstancedMesh(geom, centersMat, 6);
    if (!(this.centers as any).instanceColor) {
      (this.centers as any).instanceColor =
        new THREE.InstancedBufferAttribute(new Float32Array(6 * 3), 3);
    }
    const faces: Face[] = ["U", "D", "F", "B", "R", "L"];
    const c = new THREE.Color();
    for (let k = 0; k < faces.length; k++) {
      const f = faces[k];
      this.centers.setMatrixAt(k, matrixFor(f, 0, 0));
      c.setHex(FACE_COLORS[f]);
      this.centers.setColorAt(k, c);
    }
    (this.centers as any).instanceColor.needsUpdate = true;
    this.centers.instanceMatrix.needsUpdate = true;
    this.root.add(this.centers);

    // Initial colors for moving stickers from solved state
    this.refreshColors();
  }

  getPerm48(): Uint16Array {
    return new Uint16Array(this.state);
  }

  setHoverHighlights(indices: number[]): void {
    const count = Math.min(indices.length, 48);
    this.highlight.count = count;
    const localNormal = new THREE.Vector3(0, 0, 1);
    for (let k = 0; k < count; k++) {
      const d = indices[k];
      const m = this.slotMats[d].clone();
      const pos = new THREE.Vector3();
      const rot = new THREE.Quaternion();
      const scl = new THREE.Vector3();
      m.decompose(pos, rot, scl);
      const lift = localNormal.clone().applyQuaternion(rot).multiplyScalar(0.035);
      pos.add(lift);
      scl.multiplyScalar(1.06);
      const out = new THREE.Matrix4().compose(pos, rot, scl);
      this.highlight.setMatrixAt(k, out);
    }
    this.highlight.instanceMatrix.needsUpdate = true;
  }

  get object3d(): THREE.Group { return this.root; }

  reset(): void {
    this.state = identity48();
    this.refreshColors();
  }

  enqueue(tokens: MoveToken[], quarterMs = 200): void {
    for (const t of tokens) this.queue.push(t);
    if (!this.active) this.startNext(quarterMs);
  }

  update(dtMs: number): void {
    if (!this.active) return;
    const a = this.active;
    a.elapsedMs += dtMs;

    if (this.overlayGroup) {
      const angle = Math.min(1, a.elapsedMs / a.durationMs) * a.targetAngle;
      const q = new THREE.Quaternion().setFromAxisAngle(a.axis, angle);
      this.overlayGroup.setRotationFromQuaternion(q);
    }

    if (a.elapsedMs >= a.durationMs) {
      this.finishActive();
      this.startNext(a.durationMs);
    }
  }

  // ----- internals -----

  private startNext(quarterMs: number): void {
    const next = this.queue.shift();
    if (!next) { this.active = null; return; }

    const face = next.face;
    const perm = next.power === 2 ? permDouble(face) : (next.prime ? permPrime(face) : permQuarter(face));
    const movers = this.computeLayer(face);
    const axis = axisFromFace(face);
    const pivot = pivotFromFace(face);
    const sign = next.power === 2 ? 1 : (next.prime ? -1 : 1);
    const targetAngle = sign * (next.power === 2 ? Math.PI : Math.PI / 2);

    this.buildOverlay(face, movers, axis, pivot);

    this.active = {
      face, perm, durationMs: next.power === 2 ? Math.max(quarterMs * 1.5, 250) : quarterMs,
      elapsedMs: 0, targetAngle, axis, pivot, movers
    };
  }

  private finishActive(): void {
    if (!this.active) return;
    const a = this.active;

    // Commit: state' = state ∘ P
    this.state = compose48(this.state, a.perm);

    // Destroy overlay & restore base
    this.destroyOverlay();
    this.hidden.length = 0;

    // Reapply base solved-slot transforms (unchanged) and refresh colors from new state
    this.base.instanceMatrix.needsUpdate = true;
    this.refreshColors();

    this.active = null;
    this.onStateChanged?.();
  }

  private computeLayer(face: Face): number[] {
    const movers: number[] = [];
    for (let d = 0; d < 48; d++) if (onLayer(d, face)) movers.push(d);
    return movers; // 20 entries: 8 on face, 12 in belt
  }

  private buildOverlay(face: Face, movers: number[], axis: THREE.Vector3, pivot: THREE.Vector3): void {
    this.destroyOverlay();

    const geom = this.base.geometry;
    const mat = (this.base.material as THREE.MeshStandardMaterial).clone();
    const overlay = new THREE.InstancedMesh(geom, mat, movers.length);
    if (!(overlay as any).instanceColor) {
      (overlay as any).instanceColor =
        new THREE.InstancedBufferAttribute(new Float32Array(movers.length * 3), 3);
    }

    const group = new THREE.Group();
    group.position.copy(pivot);
    this.root.add(group);
    group.add(overlay);

    const invPivot = new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z);

    const zero = new THREE.Vector3(0, 0, 0);

    this.hidden = movers.slice();
    for (const d of movers) {
      const idx = movers.indexOf(d);
      const mWorld = this.slotMats[d].clone();
      const mLocal = invPivot.clone().multiply(mWorld);
      overlay.setMatrixAt(idx, mLocal);

      // Base -> zero scale
      const s0 = this.slotMats[d].clone();
      s0.scale(zero);
      this.base.setMatrixAt(d, s0);
    }
    this.base.instanceMatrix.needsUpdate = true;

    // Colors for overlay from current state[dest] = src
    const c = new THREE.Color();
    for (let k = 0; k < movers.length; k++) {
      const dest = movers[k];
      const src = this.state[dest];
      c.setHex(colorForSticker(src));
      overlay.setColorAt(k, c);
    }
    (overlay as any).instanceColor.needsUpdate = true;

    this.overlayGroup = group;
    this.overlay = overlay;
  }

  private destroyOverlay(): void {
    if (!this.overlayGroup) return;

    // Restore base transforms for previously hidden dests
    for (const d of this.hidden) this.base.setMatrixAt(d, this.slotMats[d]);
    this.base.instanceMatrix.needsUpdate = true;

    this.overlayGroup.parent?.remove(this.overlayGroup);
    this.overlay?.geometry.dispose(); // shared geom shallowly referenced; keep it
    this.overlay?.dispose();

    this.overlayGroup = null;
    this.overlay = null;
  }

  private refreshColors(): void {
    const c = new THREE.Color();
    for (let dest = 0; dest < 48; dest++) {
      const src = this.state[dest];
      c.setHex(colorForSticker(src));
      this.base.setColorAt(dest, c);
    }
    (this.base as any).instanceColor.needsUpdate = true;
  }
}
