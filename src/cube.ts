import * as THREE from "three";

export interface RubiksCubeOptions {
  cubeletSize?: number;
  gap?: number;
}

const FACE_COLORS = {
  right: 0xd32f2f,
  left: 0xfb8c00,
  up: 0xffffff,
  down: 0xfdd835,
  front: 0x43a047,
  back: 0x1e88e5,
};

export function buildRubiksCube(
  scene: THREE.Scene,
  opts: RubiksCubeOptions = {}
): THREE.Group {
  const { cubeletSize = 1, gap = 0.02 } = opts;
  const spacing = cubeletSize + gap;

  const group = new THREE.Group();
  group.name = "rubiksCube";

  const boxGeometry = new THREE.BoxGeometry(cubeletSize, cubeletSize, cubeletSize);

  const sharedMaterialProps = { metalness: 0.05, roughness: 0.6 };
  const neutralMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    ...sharedMaterialProps,
  });
  const materialsMap = {
    right: new THREE.MeshStandardMaterial({ color: FACE_COLORS.right, ...sharedMaterialProps }),
    left: new THREE.MeshStandardMaterial({ color: FACE_COLORS.left, ...sharedMaterialProps }),
    up: new THREE.MeshStandardMaterial({ color: FACE_COLORS.up, ...sharedMaterialProps }),
    down: new THREE.MeshStandardMaterial({ color: FACE_COLORS.down, ...sharedMaterialProps }),
    front: new THREE.MeshStandardMaterial({ color: FACE_COLORS.front, ...sharedMaterialProps }),
    back: new THREE.MeshStandardMaterial({ color: FACE_COLORS.back, ...sharedMaterialProps }),
  } as const;

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) {
          continue;
        }

        const materials: THREE.Material[] = [
          neutralMaterial,
          neutralMaterial,
          neutralMaterial,
          neutralMaterial,
          neutralMaterial,
          neutralMaterial,
        ];

        if (x === 1) materials[0] = materialsMap.right;
        if (x === -1) materials[1] = materialsMap.left;
        if (y === 1) materials[2] = materialsMap.up;
        if (y === -1) materials[3] = materialsMap.down;
        if (z === 1) materials[4] = materialsMap.front;
        if (z === -1) materials[5] = materialsMap.back;

        const cubelet = new THREE.Mesh(boxGeometry, materials);
        cubelet.position.set(x * spacing, y * spacing, z * spacing);

        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(boxGeometry),
          new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 })
        );
        edges.position.copy(cubelet.position);

        group.add(cubelet);
        group.add(edges);
      }
    }
  }

  const coreGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    ...sharedMaterialProps,
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  group.add(core);

  scene.add(group);
  return group;
}
