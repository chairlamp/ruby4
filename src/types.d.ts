export {};

declare global {
  interface WindowEventMap {
    moveInput: CustomEvent<string>;
  }
}

declare module "three/examples/jsm/controls/OrbitControls.js";
