import "./styles.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { CubeView } from "./cube";
import { mountKeypad } from "./keypad";
import { tokenize, type MoveToken } from "./parser";
import { CubeState } from "./core/state3";
import { CubeController } from "./controller";

declare global {
  interface Window {
    getSequence: () => string;
    parseSequence: (input: string) => MoveToken[];
    toggleSpin: () => void;
    getPerm: () => number[];
    enqueue: (input: string) => void;
  }
}

const currentSequence: string[] = [];
let lastLogTime = 0;
let pendingLogHandle: number | undefined;

const logSequence = () => {
  lastLogTime = Date.now();
  console.log("Sequence:", currentSequence.join(" "));
  if (pendingLogHandle !== undefined) {
    clearTimeout(pendingLogHandle);
    pendingLogHandle = undefined;
  }
};

const scheduleSequenceLog = () => {
  const now = Date.now();
  const elapsed = now - lastLogTime;
  if (elapsed >= 1000) {
    logSequence();
    return;
  }
  if (pendingLogHandle === undefined) {
    pendingLogHandle = window.setTimeout(logSequence, 1000 - elapsed);
  }
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f1115);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x0b0b0b);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(4.5, 4.5, 6);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 6, 4);
scene.add(directionalLight);

const cubeView = new CubeView(scene, { cubeletSize: 0.98, gap: 0.02, turnMs: 180 });
const cubeState = new CubeState();
const controller = new CubeController(cubeView, cubeState);
const cubeGroup = cubeView.getGroup();
let spinEnabled = false;
const spinSpeed = 0.25;

const uiRoot = document.getElementById("ui");
if (!uiRoot) {
  throw new Error("UI root element not found");
}

mountKeypad(uiRoot, (token) => {
  currentSequence.push(token);
  scheduleSequenceLog();
  controller.enqueue(token);
});

window.getSequence = () => currentSequence.join(" ");
window.parseSequence = (input: string) => tokenize(input);
window.toggleSpin = () => {
  spinEnabled = !spinEnabled;
};
(window as any).getPerm = () => Array.from(cubeState.getPermutation());
(window as any).enqueue = (input: string) => {
  if (!input.trim()) return;
  controller.enqueueMany(tokenize(input));
};
(window as any).scramble = () =>
  controller.enqueueMany(["F", "R", "U", "L", "D'", "F", "B'", "R", "U"]);

const handleResize = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
};

window.addEventListener("resize", handleResize);

const animate = () => {
  if (spinEnabled) {
    cubeGroup.rotation.y += spinSpeed * 0.01;
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

animate();
