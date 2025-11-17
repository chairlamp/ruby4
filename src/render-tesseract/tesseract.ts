import * as THREE from "three";
import { rotPlane, type Axis4, hypercubeVertices4, hypercubeEdges4 } from "../core-r4";

export type DoublePlane = { i: Axis4; j: Axis4; k: Axis4; l: Axis4 };
const SCRATCH_MATRIX = new THREE.Matrix4();

export function createTesseract(initial: DoublePlane, renderer: THREE.WebGLRenderer) {
  const verts4 = hypercubeVertices4();
  const edges = hypercubeEdges4();
  const idx = new Uint16Array(edges.length * 2);
  edges.forEach((e, n) => {
    idx[2 * n] = e[0];
    idx[2 * n + 1] = e[1];
  });

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position4D", new THREE.BufferAttribute(verts4, 4));
  geom.setIndex(new THREE.BufferAttribute(idx, 1));
  geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(16 * 3), 3));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uR1: { value: new THREE.Matrix4().identity() },
      uR2: { value: new THREE.Matrix4().identity() },
      uP0: { value: new THREE.Vector4(1, 0, 0, 0) },
      uP1: { value: new THREE.Vector4(0, 1, 0, 0) },
      uP2: { value: new THREE.Vector4(0, 0, 1, 0) },
      uD: { value: 3.0 },
      uScale: { value: 3.4 },
      uW0: { value: 0.0 },
      uHalf: { value: 0.18 },
      uSliceOn: { value: 0.0 },
      uColor: { value: new THREE.Color(0xeff6ff) },
    },
    transparent: true,
    depthTest: true,
    depthWrite: false,
    vertexShader: `
      attribute vec4 position4D;
      uniform mat4 uR1, uR2;
      uniform vec4 uP0, uP1, uP2;
      uniform float uD;
      uniform float uScale;
      uniform float uW0, uHalf, uSliceOn;

      varying float vAlpha;

      vec3 project34(vec4 p4) {
        vec3 p3 = vec3(dot(uP0, p4), dot(uP1, p4), dot(uP2, p4));
        float denom = max(1e-3, uD - p4.w);
        return p3 / denom;
      }

      void main() {
        vec4 p4 = uR2 * uR1 * position4D;

        float d = abs(p4.w - uW0);
        float inner = 0.5 * uHalf;
        float a = 1.0 - smoothstep(inner, uHalf, d);
        vAlpha = mix(1.0, a, clamp(uSliceOn, 0.0, 1.0));

        vec3 p3 = project34(p4) * uScale;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p3, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(uColor, clamp(vAlpha, 0.0, 1.0));
      }
    `,
    linewidth: 1,
  });

  const lines = new THREE.LineSegments(geom, mat);
  lines.frustumCulled = false;

  let planes = { ...initial };
  let theta = 0;
  let phi = 0;

  const toTHREE = (m: Float64Array) => {
    const t = SCRATCH_MATRIX;
    t.set(
      m[0], m[4], m[8], m[12],
      m[1], m[5], m[9], m[13],
      m[2], m[6], m[10], m[14],
      m[3], m[7], m[11], m[15]
    );
    return t;
  };

  function setAngles(th: number, ph: number) {
    theta = th;
    phi = ph;
    const A = rotPlane(planes.i, planes.j, theta);
    const B = rotPlane(planes.k, planes.l, phi);
    (mat.uniforms.uR1.value as THREE.Matrix4).copy(toTHREE(A));
    (mat.uniforms.uR2.value as THREE.Matrix4).copy(toTHREE(B));
  }

  function setPlanes(p: DoublePlane) {
    planes = { ...p };
    setAngles(theta, phi);
  }

  function setProjection(rows: [THREE.Vector4, THREE.Vector4, THREE.Vector4], d: number) {
    mat.uniforms.uP0.value.copy(rows[0]);
    mat.uniforms.uP1.value.copy(rows[1]);
    mat.uniforms.uP2.value.copy(rows[2]);
    mat.uniforms.uD.value = d;
  }

  function setSlice(w0: number, half: number, on: boolean) {
    mat.uniforms.uW0.value = w0;
    mat.uniforms.uHalf.value = Math.max(1e-4, half);
    mat.uniforms.uSliceOn.value = on ? 1.0 : 0.0;
  }

  function setScale(s: number) {
    mat.uniforms.uScale.value = s;
  }

  setAngles(0, 0);
  setScale(mat.uniforms.uScale.value as number);

  return { object3d: lines, setAngles, setPlanes, setProjection, setSlice, setScale };
}
