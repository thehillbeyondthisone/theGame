import 'three';

// super-three additions not covered by @types/three.
declare module 'three' {
  interface WebGLRendererParameters {
    /** Render both eyes in one pass (OCULUS_multiview) when the headset supports it. */
    multiviewStereo?: boolean;
  }

  interface WebXRManager {
    /** True while the current session renders with multiview. */
    isMultiview: boolean;
  }
}
