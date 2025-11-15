import * as THREE from "three";
import type { MoveToken } from "./core/types";

type Axis = "x" | "y" | "z";

function tokenInfo(tok: MoveToken): { axis: Axis; layer: 1 | -1; quarter: -1 | 1 } {
  const f = tok[0];
  const prime = tok.endsWith("'");
  let axis: Axis;
  let layer: 1 | -1;
  let cwQuarter: -1 | 1;
  if (f === "U") {
    axis = "y";
    layer = 1;
    cwQuarter = -1;
  } else if (f === "D") {
    axis = "y";
    layer = -1;
    cwQuarter = 1;
  } else if (f === "R") {
    axis = "x";
    layer = 1;
    cwQuarter = -1;
  } else if (f === "L") {
    axis = "x";
    layer = -1;
    cwQuarter = 1;
  } else if (f === "F") {
    axis = "z";
    layer = 1;
    cwQuarter = -1;
  } else {
    axis = "z";
    layer = -1;
    cwQuarter = 1;
  }
  const q = prime ? ((cwQuarter * -1) as -1 | 1) : cwQuarter;
  return { axis, layer, quarter: q };
}

const FACE_COLORS = {
  R: 0xd32f2f,
  L: 0xfb8c00,
  U: 0xffffff,
  D: 0xfdd835,
  F: 0x43a047,
  B: 0x1e88e5,
} as const;

export class CubeView {
  private root = new THREE.Group();
  private cubelets: THREE.Mesh[] = [];
  private coords = new Map<THREE.Object3D, [number, number, number]>();
  private gap: number;
  private cubeletSize: number;
  private turnMs: number;
  private step: number;

  constructor(
    scene: THREE.Scene,
    opts?: { cubeletSize?: number; gap?: number; turnMs?: number }
  ) {
    this.cubeletSize = opts?.cubeletSize ?? 0.98;
    this.gap = opts?.gap ?? 0.02;
    this.turnMs = opts?.turnMs ?? 180;
    this.step = 1 + this.gap;
    this.build();
    scene.add(this.root);
  }

  getGroup() {
    return this.root;
  }

  private build() {
    const neutral = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.6,
      metalness: 0.05,
    });
    const materials: Record<string, THREE.MeshStandardMaterial> = {
      R: new THREE.MeshStandardMaterial({ color: FACE_COLORS.R }),
      L: new THREE.MeshStandardMaterial({ color: FACE_COLORS.L }),
      U: new THREE.MeshStandardMaterial({ color: FACE_COLORS.U }),
      D: new THREE.MeshStandardMaterial({ color: FACE_COLORS.D }),
      F: new THREE.MeshStandardMaterial({ color: FACE_COLORS.F }),
      B: new THREE.MeshStandardMaterial({ color: FACE_COLORS.B }),
    };
    const geom = new THREE.BoxGeometry(1, 1, 1);

    for (const ix of [-1, 0, 1]) {
      for (const iy of [-1, 0, 1]) {
        for (const iz of [-1, 0, 1]) {
          if (ix === 0 && iy === 0 && iz === 0) continue;
          const mats: THREE.Material[] = [
            ix === 1 ? materials.R : neutral,
            ix === -1 ? materials.L : neutral,
            iy === 1 ? materials.U : neutral,
            iy === -1 ? materials.D : neutral,
            iz === 1 ? materials.F : neutral,
            iz === -1 ? materials.B : neutral,
          ];
          const mesh = new THREE.Mesh(geom, mats);
          mesh.scale.setScalar(this.cubeletSize);
          mesh.position.set(ix * this.step, iy * this.step, iz * this.step);
          this.root.add(mesh);
          this.cubelets.push(mesh);
          this.coords.set(mesh, [ix, iy, iz]);
          const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(geom),
            new THREE.LineBasicMaterial({ color: 0x000000 })
          );
          edges.scale.setScalar(this.cubeletSize + 0.001);
          mesh.add(edges);
        }
      }
    }
  }

  private selectLayer(axis: Axis, layer: 1 | -1): THREE.Object3D[] {
    const items: THREE.Object3D[] = [];
    for (const mesh of this.cubelets) {
      const coord = this.coords.get(mesh)!;
      const [x, y, z] = coord;
      if (axis === "x" && x === layer) items.push(mesh);
      else if (axis === "y" && y === layer) items.push(mesh);
      else if (axis === "z" && z === layer) items.push(mesh);
    }
    return items;
  }

  private snapAndRecord(group: THREE.Group) {
    const children = [...group.children];
    for (const child of children) {
      this.root.attach(child); // keep world transform resulting from rotation
      const pos = child.position;
      child.position.set(
        Math.round(pos.x / this.step) * this.step,
        Math.round(pos.y / this.step) * this.step,
        Math.round(pos.z / this.step) * this.step
      );
      const coord = this.coords.get(child)!;
      coord[0] = Math.round(child.position.x / this.step);
      coord[1] = Math.round(child.position.y / this.step);
      coord[2] = Math.round(child.position.z / this.step);
      child.rotation.x = Math.round(child.rotation.x / (Math.PI / 2)) * (Math.PI / 2);
      child.rotation.y = Math.round(child.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
      child.rotation.z = Math.round(child.rotation.z / (Math.PI / 2)) * (Math.PI / 2);
    }
    group.removeFromParent();
    group.clear();
  }

  async turn(token: MoveToken): Promise<void> {
    const { axis, layer, quarter } = tokenInfo(token);
    const turns = token.endsWith("2") ? 2 : 1;
    const axisVector =
      axis === "x"
        ? new THREE.Vector3(1, 0, 0)
        : axis === "y"
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1);

    for (let i = 0; i < turns; i++) {
      const temp = new THREE.Group();
      this.root.add(temp);
      const items = this.selectLayer(axis, layer);
      for (const item of items) {
        temp.attach(item);
      }
      const target = quarter * (Math.PI / 2);
      const start = performance.now();
      const duration = this.turnMs;

      await new Promise<void>((resolve) => {
        const frame = () => {
          const t = Math.min(1, (performance.now() - start) / duration);
          const angle = target * t;
          temp.rotation.set(0, 0, 0);
          temp.rotateOnAxis(axisVector, angle);
          if (t < 1) {
            requestAnimationFrame(frame);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(frame);
      });

      this.snapAndRecord(temp);
    }
  }
}
