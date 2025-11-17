export type VIdx = number;
export type Edge = [VIdx, VIdx];
export type Cell = VIdx[];

export function hypercubeVertices4(): Float32Array {
  const out = new Float32Array(16 * 4);
  let p = 0;
  for (let x = -1; x <= 1; x += 2)
    for (let y = -1; y <= 1; y += 2)
      for (let z = -1; z <= 1; z += 2)
        for (let w = -1; w <= 1; w += 2) {
          out[p++] = x;
          out[p++] = y;
          out[p++] = z;
          out[p++] = w;
        }
  return out;
}

export function vIndex(x: -1 | 1, y: -1 | 1, z: -1 | 1, w: -1 | 1): VIdx {
  return ((x + 1) >> 1) * 8 + ((y + 1) >> 1) * 4 + ((z + 1) >> 1) * 2 + ((w + 1) >> 1);
}

export function hypercubeEdges4(): Edge[] {
  const E: Edge[] = [];
  const signs = [-1, 1] as const;
  for (const x of signs)
    for (const y of signs)
      for (const z of signs)
        for (const w of signs) {
          const a = vIndex(x, y, z, w);
          if (x === -1) E.push([a, vIndex(1, y, z, w)]);
          if (y === -1) E.push([a, vIndex(x, 1, z, w)]);
          if (z === -1) E.push([a, vIndex(x, y, 1, w)]);
          if (w === -1) E.push([a, vIndex(x, y, z, 1)]);
        }
  return E;
}

export function hypercubeCells4(): Cell[] {
  const cells: Cell[] = [];
  const signs = [-1, 1] as const;

  for (const x of signs) {
    const verts: VIdx[] = [];
    for (const y of signs) for (const z of signs) for (const w of signs) verts.push(vIndex(x, y, z, w));
    cells.push(verts);
  }
  for (const y of signs) {
    const verts: VIdx[] = [];
    for (const x of signs) for (const z of signs) for (const w of signs) verts.push(vIndex(x, y, z, w));
    cells.push(verts);
  }
  for (const z of signs) {
    const verts: VIdx[] = [];
    for (const x of signs) for (const y of signs) for (const w of signs) verts.push(vIndex(x, y, z, w));
    cells.push(verts);
  }
  for (const w of signs) {
    const verts: VIdx[] = [];
    for (const x of signs) for (const y of signs) for (const z of signs) verts.push(vIndex(x, y, z, w));
    cells.push(verts);
  }

  return cells;
}
