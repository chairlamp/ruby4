import * as THREE from "three";
import { MoveToken } from "./core/types";

const FACE_COLORS = {
  R: 0xd32f2f,
  L: 0xfb8c00,
  U: 0xffffff,
  D: 0xfdd835,
  F: 0x43a047,
  B: 0x1e88e5,
} as const;

interface Cubelet {
  object: THREE.Group;
  ix: number;
  iy: number;
  iz: number;
}

type Axis = "x" | "y" | "z";

const TURN_MAP: Record<
  Exclude<MoveToken[0], undefined>,
  { axis: Axis; layer: 1 | -1; angle: number }
> = {
  U: { axis: "y", layer: 1, angle: -Math.PI / 2 },
  D: { axis: "y", layer: -1, angle: Math.PI / 2 },
  R: { axis: "x", layer: 1, angle: -Math.PI / 2 },
  L: { axis: "x", layer: -1, angle: Math.PI / 2 },
  F: { axis: "z", layer: 1, angle: -Math.PI / 2 },
  B: { axis: "z", layer: -1, angle: Math.PI / 2 },
};

export class CubeView {
  private readonly root = new THREE.Group();
  private readonly cubelets: Cubelet[] = [];
  private readonly spacing: number;
  private readonly turnMs: number;
  private readonly axisVectors = {
    x: new THREE.Vector3(1, 0, 0),
    y: new THREE.Vector3(0, 1, 0),
    z: new THREE.Vector3(0, 0, 1),
  };

  constructor(
    scene: THREE.Scene,
    opts: { cubeletSize?: number; gap?: number; turnMs?: number } = {}
  ) {
    const cubeletSize = opts.cubeletSize ?? 0.98;
    const gap = opts.gap ?? 0.02;
    this.turnMs = opts.turnMs ?? 280;
    this.spacing = cubeletSize + gap;
    scene.add(this.root);
    this.buildCube(cubeletSize, gap);
  }

  getGroup(): THREE.Group {
    return this.root;
  }

  async turn(token: MoveToken): Promise<void> {
    const face = token[0] as keyof typeof TURN_MAP;
    const base = TURN_MAP[face];
    if (!base) return;
    const suffix = token.length > 1 ? token.slice(1) : "";
    let angle = base.angle;
    if (suffix === "'") {
      angle *= -1;
    }
    const turns = suffix === "2" ? 2 : 1;
    for (let i = 0; i < turns; i++) {
      await this.animateLayer(base.axis, base.layer, angle);
    }
  }

  private buildCube(cubeletSize: number, gap: number) {
    const spacing = cubeletSize + gap;
    const geometry = new THREE.BoxGeometry(cubeletSize, cubeletSize, cubeletSize);
    const neutralMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.6,
      metalness: 0.05,
    });
    const materialsCache: Record<string, THREE.MeshStandardMaterial> = {};
    const getFaceMaterial = (face: keyof typeof FACE_COLORS) => {
      const key = face;
      if (!materialsCache[key]) {
        materialsCache[key] = new THREE.MeshStandardMaterial({
          color: FACE_COLORS[face],
          roughness: 0.6,
          metalness: 0.05,
        });
      }
      return materialsCache[key];
    };
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });

    for (let ix = -1; ix <= 1; ix++) {
      for (let iy = -1; iy <= 1; iy++) {
        for (let iz = -1; iz <= 1; iz++) {
          if (ix === 0 && iy === 0 && iz === 0) continue;

          const materials: THREE.Material[] = [
            neutralMaterial,
            neutralMaterial,
            neutralMaterial,
            neutralMaterial,
            neutralMaterial,
            neutralMaterial,
          ];

          if (ix === 1) materials[0] = getFaceMaterial("R");
          if (ix === -1) materials[1] = getFaceMaterial("L");
          if (iy === 1) materials[2] = getFaceMaterial("U");
          if (iy === -1) materials[3] = getFaceMaterial("D");
          if (iz === 1) materials[4] = getFaceMaterial("F");
          if (iz === -1) materials[5] = getFaceMaterial("B");

          const mesh = new THREE.Mesh(geometry, materials);
          const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            edgeMaterial
          );

          const cubeletGroup = new THREE.Group();
          cubeletGroup.add(mesh);
          cubeletGroup.add(edges);
          cubeletGroup.position.set(ix * spacing, iy * spacing, iz * spacing);

          this.root.add(cubeletGroup);
          this.cubelets.push({ object: cubeletGroup, ix, iy, iz });
        }
      }
    }
  }

  private animateLayer(axis: Axis, layer: 1 | -1, angle: number): Promise<void> {
    const targetCubelets = this.cubelets.filter((cubelet) => {
      if (axis === "x") return cubelet.ix === layer;
      if (axis === "y") return cubelet.iy === layer;
      return cubelet.iz === layer;
    });
    if (targetCubelets.length === 0 || angle === 0) {
      return Promise.resolve();
    }

    const pivot = new THREE.Group();
    this.root.add(pivot);
    targetCubelets.forEach((cubelet) => {
      pivot.attach(cubelet.object);
    });

    const axisVector = this.axisVectors[axis];
    const duration = this.turnMs;

    return new Promise((resolve) => {
      const start = performance.now();
      let lastAngle = 0;

      const step = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        const currentAngle = angle * t;
        const delta = currentAngle - lastAngle;
        pivot.rotateOnAxis(axisVector, delta);
        lastAngle = currentAngle;

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          targetCubelets.forEach((cubelet) => {
            this.root.attach(cubelet.object);
            this.snapCubelet(cubelet);
          });
          this.root.remove(pivot);
          resolve();
        }
      };

      requestAnimationFrame(step);
    });
  }

  private snapCubelet(cubelet: Cubelet) {
    cubelet.ix = Math.round(cubelet.object.position.x / this.spacing);
    cubelet.iy = Math.round(cubelet.object.position.y / this.spacing);
    cubelet.iz = Math.round(cubelet.object.position.z / this.spacing);

    cubelet.object.position.set(
      cubelet.ix * this.spacing,
      cubelet.iy * this.spacing,
      cubelet.iz * this.spacing
    );

    cubelet.object.rotation.set(
      this.snapAngle(cubelet.object.rotation.x),
      this.snapAngle(cubelet.object.rotation.y),
      this.snapAngle(cubelet.object.rotation.z)
    );
  }

  private snapAngle(value: number): number {
    const step = Math.PI / 2;
    return Math.round(value / step) * step;
  }
}
