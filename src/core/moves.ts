import type { Face, MoveToken, Perm } from "./types";

export type V3 = [number, number, number];
export type Sticker = {
  face: Face;
  r: 0 | 1 | 2;
  c: 0 | 1 | 2;
  xyz: V3;
  normal: V3;
};

const FACES: Face[] = ["U", "R", "F", "D", "L", "B"];
const FACE_OFFSETS: Record<Face, number> = {
  U: 0,
  R: 8,
  F: 16,
  D: 24,
  L: 32,
  B: 40,
};

const FACE_NORMALS: Record<Face, V3> = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
};

type Axis = "x" | "y" | "z";

const FACE_DATA: Record<Face, { axis: Axis; layer: 1 | -1; clockwiseSign: 1 | -1 }> = {
  U: { axis: "y", layer: 1, clockwiseSign: -1 },
  D: { axis: "y", layer: -1, clockwiseSign: 1 },
  R: { axis: "x", layer: 1, clockwiseSign: -1 },
  L: { axis: "x", layer: -1, clockwiseSign: 1 },
  F: { axis: "z", layer: 1, clockwiseSign: -1 },
  B: { axis: "z", layer: -1, clockwiseSign: 1 },
};

const RC_POSITIONS: Array<[0 | 1 | 2, 0 | 1 | 2]> = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 0],
  [1, 2],
  [2, 0],
  [2, 1],
  [2, 2],
];

function coordinatesFor(face: Face, r: 0 | 1 | 2, c: 0 | 1 | 2): V3 {
  switch (face) {
    case "U":
      return [-1 + c, 1, 1 - r] as V3;
    case "D":
      return [-1 + c, -1, -1 + r] as V3;
    case "F":
      return [-1 + c, 1 - r, 1] as V3;
    case "B":
      return [1 - c, 1 - r, -1] as V3;
    case "R":
      return [1, 1 - r, 1 - c] as V3;
    case "L":
      return [-1, 1 - r, -1 + c] as V3;
    default:
      throw new Error(`unknown face ${face}`);
  }
}

function stickerKey(xyz: V3, normal: V3): string {
  return `${xyz[0]},${xyz[1]},${xyz[2]}|${normal[0]},${normal[1]},${normal[2]}`;
}

const STICKERS: Sticker[] = new Array(48);
const STICKER_KEY_TO_INDEX = new Map<string, number>();

for (const face of FACES) {
  const offset = faceIndexOffset(face);
  RC_POSITIONS.forEach(([r, c], localIndex) => {
    const xyz = coordinatesFor(face, r, c);
    const normal = [...FACE_NORMALS[face]] as V3;
    const sticker: Sticker = {
      face,
      r,
      c,
      xyz,
      normal,
    };
    const globalIndex = offset + localIndex;
    STICKERS[globalIndex] = sticker;
    STICKER_KEY_TO_INDEX.set(stickerKey(xyz, normal), globalIndex);
  });
}

export const S0: Perm = Uint16Array.from([...Array(48)].map((_, i) => i));

export function faceIndexOffset(face: Face): number {
  return FACE_OFFSETS[face];
}

function localIndexFor(r: 0 | 1 | 2, c: 0 | 1 | 2): number {
  if (r === 1 && c === 1) {
    return -1;
  }
  for (let i = 0; i < RC_POSITIONS.length; i++) {
    const [rr, cc] = RC_POSITIONS[i];
    if (rr === r && cc === c) {
      return i;
    }
  }
  return -1;
}

export function idx(face: Face, r: 0 | 1 | 2, c: 0 | 1 | 2): number {
  const local = localIndexFor(r, c);
  if (local === -1) {
    return -1;
  }
  return faceIndexOffset(face) + local;
}

export function idxStrict(face: Face, r: 0 | 1 | 2, c: 0 | 1 | 2): number {
  const index = idx(face, r, c);
  if (index === -1) {
    throw new Error("center sticker has no index");
  }
  return index;
}

export function stickerAtIndex(index: number): Sticker {
  const base = STICKERS[index];
  if (!base) {
    throw new Error(`invalid sticker index ${index}`);
  }
  return {
    face: base.face,
    r: base.r,
    c: base.c,
    xyz: [...base.xyz] as V3,
    normal: [...base.normal] as V3,
  };
}

export function indexOfSticker(sticker: Sticker): number {
  return idxStrict(sticker.face, sticker.r, sticker.c);
}

function axisIndex(axis: Axis): 0 | 1 | 2 {
  switch (axis) {
    case "x":
      return 0;
    case "y":
      return 1;
    default:
      return 2;
  }
}

function rotX90([x, y, z]: V3, sign: 1 | -1): V3 {
  return [x, sign * -z, sign * y] as V3;
}

function rotY90([x, y, z]: V3, sign: 1 | -1): V3 {
  return [sign * z, y, sign * -x] as V3;
}

function rotZ90([x, y, z]: V3, sign: 1 | -1): V3 {
  return [sign * -y, sign * x, z] as V3;
}

function rotateVector(v: V3, axis: Axis, sign: 1 | -1): V3 {
  switch (axis) {
    case "x":
      return rotX90(v, sign);
    case "y":
      return rotY90(v, sign);
    default:
      return rotZ90(v, sign);
  }
}

function stickerIndexByVectors(xyz: V3, normal: V3): number {
  const key = stickerKey(xyz, normal);
  const index = STICKER_KEY_TO_INDEX.get(key);
  if (index === undefined) {
    throw new Error(`no sticker for key ${key}`);
  }
  return index;
}

function quarterPermutation(face: Face, sign: 1 | -1): Perm {
  const { axis, layer } = FACE_DATA[face];
  const axisIdx = axisIndex(axis);
  const perm = new Uint16Array(48);
  for (let i = 0; i < 48; i++) {
    perm[i] = i;
  }
  for (let i = 0; i < 48; i++) {
    const sticker = stickerAtIndex(i);
    if (sticker.xyz[axisIdx] !== layer) {
      continue;
    }
    const rotatedXYZ = rotateVector(sticker.xyz, axis, sign);
    const rotatedNormal = rotateVector(sticker.normal, axis, sign);
    const dest = stickerIndexByVectors(rotatedXYZ, rotatedNormal);
    perm[i] = dest;
  }
  return perm;
}

export function permutationFor(token: MoveToken): Perm {
  const face = token[0] as Face;
  const info = FACE_DATA[face];
  const suffix = token.length > 1 ? token.slice(1) : "";
  let sign: 1 | -1 = info.clockwiseSign;
  let turns = 1;
  if (suffix === "'") {
    sign = (sign * -1) as 1 | -1;
  } else if (suffix === "2") {
    turns = 2;
  }
  const quarter = quarterPermutation(face, sign);
  if (turns === 1) {
    return quarter;
  }
  return compose(quarter, quarter);
}

export function compose(A: Perm, B: Perm): Perm {
  const result = new Uint16Array(48);
  for (let i = 0; i < 48; i++) {
    result[i] = A[B[i]];
  }
  return result;
}

export function inverse(P: Perm): Perm {
  const inv = new Uint16Array(48);
  for (let i = 0; i < 48; i++) {
    inv[P[i]] = i;
  }
  return inv;
}

export function isValidPermutation(P: Perm): boolean {
  if (P.length !== 48) {
    return false;
  }
  const seen = new Array(48).fill(false);
  for (let i = 0; i < 48; i++) {
    const v = P[i];
    if (v < 0 || v >= 48 || seen[v]) {
      return false;
    }
    seen[v] = true;
  }
  return true;
}

export function permutationSign(P: Perm): 1 | -1 {
  const visited = new Array(48).fill(false);
  let cycles = 0;
  for (let i = 0; i < 48; i++) {
    if (visited[i]) continue;
    cycles++;
    let j = i;
    while (!visited[j]) {
      visited[j] = true;
      j = P[j];
    }
  }
  return ((48 - cycles) & 1) === 0 ? 1 : -1;
}

const MOVE_TOKENS: MoveToken[] = [
  "U",
  "D",
  "L",
  "R",
  "F",
  "B",
  "U'",
  "D'",
  "L'",
  "R'",
  "F'",
  "B'",
  "U2",
  "D2",
  "L2",
  "R2",
  "F2",
  "B2",
];

const MOVE_SET = new Set(MOVE_TOKENS);

export function tokenize(input: string): MoveToken[] {
  if (!input.trim()) {
    return [];
  }
  return input
    .trim()
    .split(/\s+/)
    .map((token) => {
      if (!MOVE_SET.has(token as MoveToken)) {
        throw new Error(`invalid token ${token}`);
      }
      return token as MoveToken;
    });
}
