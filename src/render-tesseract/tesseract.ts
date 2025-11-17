import * as THREE from "three";
import { rotPlane, type Axis4 } from "../core-r4";
import {
  hypercubeVertices4,
  hypercubeEdges4,
  identity34,
  pack34to44,
  type M34,
} from "../core-r4";

export type DoublePlane = { i: Axis4; j: Axis4; k: Axis4; l: Axis4 };

export function createTesseract(initial: DoublePlane) {
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
      uP: { value: new THREE.Matrix4().identity() },
      uDepth: { value: 3.2 },
      uScale: { value: 1.0 },
      uColor: { value: new THREE.Color(0xECEFF8) },
    },
    vertexShader: `
      attribute vec4 position4D;
      uniform mat4 uR1, uR2;
      uniform mat4 uP;
      uniform float uDepth;
      uniform float uScale;
      void main() {
        vec4 p4 = (uR2 * uR1) * position4D;
        vec3 p3 = (uP * p4).xyz;
        float denom = max(1e-4, uDepth - p4.w);
        p3 /= denom;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p3 * uScale, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      void main() { gl_FragColor = vec4(uColor, 1.0); }`,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    linewidth: 1,
  });

  const lines = new THREE.LineSegments(geom, mat);
  lines.frustumCulled = false;
  lines.renderOrder = 999;

  let planes = { ...initial };
  let theta = 0;
  let phi = 0;

  const toTHREE = (m: Float64Array) => {
    const t = new THREE.Matrix4();
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
    (mat.uniforms.uR1.value as THREE.Matrix4).copy(toTHREE(rotPlane(planes.i, planes.j, theta)));
    (mat.uniforms.uR2.value as THREE.Matrix4).copy(toTHREE(rotPlane(planes.k, planes.l, phi)));
  }

  function setPlanes(p: DoublePlane) {
    planes = { ...p };
    setAngles(theta, phi);
  }

  function setProjection(P: M34) {
    (mat.uniforms.uP.value as THREE.Matrix4).copy(toTHREE(pack34to44(P)));
  }

  function setDepth(d: number) {
    (mat.uniforms.uDepth.value as number) = d;
  }

  function setScale(s: number) {
    (mat.uniforms.uScale.value as number) = s;
  }

  setProjection(identity34());
  setAngles(0, 0);

  return { object3d: lines, setAngles, setPlanes, setProjection, setDepth, setScale };
}
