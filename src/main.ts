import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mountMoveUI } from "./ui/controls";
import { StickerSystem } from "./render/stickers";
import { parseMoves } from "./ui/moveParser";
import { mountCycleList } from "./overlays/cycles/cycleList";
import { mountPermGrid } from "./overlays/perm/permGrid";
import { mountCycleWheel } from "./overlays/cycles/cycleWheel";
import "./ui/anchors.css";
import "./ui/hud.css";

const container = document.getElementById("app")!;

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
function configureColorManagement(r: THREE.WebGLRenderer) {
  const anyR = r as any;
  if ("outputColorSpace" in anyR) {
    anyR.outputColorSpace = (THREE as any).SRGBColorSpace;
    if ((THREE as any).ColorManagement) (THREE as any).ColorManagement.enabled = true;
  } else {
    anyR.outputEncoding = (THREE as any).sRGBEncoding;
    if ((THREE as any).ColorManagement) (THREE as any).ColorManagement.enabled = true;
  }
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.2;
  const ocs = anyR.outputColorSpace ?? "legacy-encoding";
  console.log("[color]", "outputColorSpace:", ocs);
}
configureColorManagement(renderer);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e14);

const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(6, 4, 6);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 0.45);
hemi.position.set(0, 1, 0);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(5, 7, 8);
key.castShadow = false;
scene.add(key);

const rim = new THREE.DirectionalLight(0xffffff, 0.9);
rim.position.set(-6, 3, -5);
scene.add(rim);

const stickers = new StickerSystem();
scene.add(stickers.object3d);

let uiRight = document.getElementById("ui-right") as HTMLDivElement | null;
if (!uiRight) {
  uiRight = document.createElement("div");
  uiRight.id = "ui-right";
  Object.assign(uiRight.style, {
    position: "absolute",
    top: "12px",
    right: "12px",
    width: "360px",
    maxHeight: "80vh",
    overflow: "auto",
    background: "rgba(15,23,42,0.72)",
    backdropFilter: "blur(6px)",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    zIndex: "20",
  } as CSSStyleDeclaration);
  document.body.appendChild(uiRight);
}
const uiRoot = uiRight!;

const listDiv = document.createElement("div");
uiRoot.appendChild(listDiv);

const onHover = (indices: number[]) => stickers.setHoverHighlights(indices);
const list = mountCycleList(listDiv, () => stickers.getPerm48(), { onHover, label: "face" });

stickers.onStateChanged = () => {
  list.refresh();
};

// -- Mount Cycle Wheel (bottom-left floating panel) --
let wheelPanel = document.getElementById("cycle-wheel-fixed") as HTMLDivElement | null;
if (!wheelPanel) {
  wheelPanel = document.createElement("div");
  wheelPanel.id = "cycle-wheel-fixed";
  Object.assign(wheelPanel.style, {
    background: "rgba(15,23,42,0.82)",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    backdropFilter: "blur(6px)",
  } as CSSStyleDeclaration);
  document.body.appendChild(wheelPanel);
} else {
  wheelPanel.innerHTML = "";
}
const wheelHost = document.createElement("div");
wheelPanel.appendChild(wheelHost);

const wheel = mountCycleWheel(wheelHost, () => stickers.getPerm48(), {
  onHover: (indices) => {
    if (indices && indices.length) stickers.setHoverHighlights(indices);
    else stickers.setHoverHighlights([]);
  },
});

{
  const prev = stickers.onStateChanged;
  stickers.onStateChanged = () => {
    prev?.();
    wheel.refresh();
  };
}

// -- NEW: left-top dock just for the permutation grid --
const uiLeft = document.createElement("div");
uiLeft.style.position = "absolute";
uiLeft.style.top = "12px";
uiLeft.style.left = "12px";
uiLeft.style.width = "340px";
uiLeft.style.maxHeight = "80vh";
uiLeft.style.overflow = "auto";
uiLeft.style.background = "rgba(15, 23, 42, 0.72)";
uiLeft.style.backdropFilter = "blur(6px)";
uiLeft.style.border = "1px solid #334155";
uiLeft.style.borderRadius = "8px";
uiLeft.style.padding = "10px";
uiLeft.style.boxShadow = "0 8px 24px rgba(0,0,0,0.35)";
uiLeft.style.zIndex = "20";
document.body.appendChild(uiLeft);

const gridDiv = document.createElement("div");
uiLeft.appendChild(gridDiv);

const onGridHover = (i: number) => {
  if (i >= 0) stickers.setHoverHighlights([i]);
  else stickers.setHoverHighlights([]);
};

const grid = mountPermGrid(gridDiv, () => stickers.getPerm48(), { onHover: onGridHover });

const prevOnStateChanged = stickers.onStateChanged;
stickers.onStateChanged = () => {
  prevOnStateChanged?.();
  grid.refresh();
};

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 4;
controls.maxDistance = 14;
controls.target.set(0, 0, 0);
controls.update();

mountMoveUI({
  onParse(tokens) {
    stickers.enqueue(tokens as any, 200);
  }
});

function onResize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener("resize", onResize);

let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = now - last;
  last = now;

  controls.update();
  stickers.update(dt);
  renderer.render(scene, camera);
});

window.play = (sequence: string) => {
  const tokens = parseMoves(sequence);
  stickers.enqueue(tokens as any, 200);
};
