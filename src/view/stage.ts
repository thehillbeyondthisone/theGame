import { AmbientLight, Color, DirectionalLight, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { PlayFrame } from '../sim/comfort';
import './multiview-fix';
import { PALETTE } from './palette';
import { CircleField } from './circle-field';

/** Seated eye height used for the phone/desktop view, m. */
export const DESKTOP_EYE = 1.2;
/** The flat-screen camera looks this far below horizontal, degrees. */
const DESKTOP_PITCH_DEG = 10;
const DEG = Math.PI / 180;

export type Look = 'desktop' | 'ar' | 'vr';

/** Renderer, scene and camera. The only place that sets up three.js itself. */
export class Stage {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(60, 1, 0.05, 50);
  private readonly background = new Color(PALETTE.night);
  private readonly pattern = new CircleField();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      // super-three: both eyes in one pass on Quest (OCULUS_multiview).
      multiviewStereo: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.5 : 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');

    this.scene.add(this.pattern.mesh);
    this.scene.add(new AmbientLight(0xffffff, 1.0));
    const key = new DirectionalLight(0xc9b6ff, 3.3);
    key.position.set(-1.3, 2.4, 1.8);
    this.scene.add(key);
    const fill = new DirectionalLight(0x594aba, 0.5);
    fill.position.set(1, 1, -1);
    this.scene.add(fill);

    this.resetCamera();
    this.setLook('desktop');
    window.addEventListener('resize', this.resize);
    window.visualViewport?.addEventListener('resize', this.resize);
    this.resize();
  }

  /** Over passthrough the background must stay transparent so your room shows through. */
  setLook(look: Look): void {
    this.scene.background = look === 'ar' ? null : this.background;
  }

  placePattern(frame: PlayFrame): void {
    this.pattern.place(frame);
  }

  showPattern(show: boolean): void {
    this.pattern.mesh.visible = show;
  }

  /**
   * WebXR overwrites the camera's pose and projection; restore the flat-screen view.
   * Called from the session's 'end' event, possibly before three.js has noticed the
   * session ended, so it doesn't wait for isPresenting to clear.
   */
  resetCamera(): void {
    this.camera.position.set(0, DESKTOP_EYE, 0);
    this.camera.lookAt(0, DESKTOP_EYE - Math.tan(DESKTOP_PITCH_DEG * DEG), -1);
    this.fitView();
  }

  /**
   * How far (degrees) the flat-screen view reaches left/right, up and down of
   * play-forward, less a margin so the disc never sits half off the edge.
   */
  viewLimits(): { yaw: number; up: number; down: number } {
    const halfV = this.camera.fov / 2;
    const halfH = Math.atan(Math.tan(halfV * DEG) * this.camera.aspect) / DEG;
    const margin = 6;
    return { yaw: halfH - margin, up: halfV - DESKTOP_PITCH_DEG - margin, down: halfV + DESKTOP_PITCH_DEG - margin };
  }

  onResize(listener: () => void): void {
    this.resizeListeners.push(listener);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private readonly resize = (): void => {
    if (!this.renderer.xr.isPresenting) this.fitView();
  };

  private fitView(): void {
    const canvas = this.renderer.domElement;
    const w = Math.max(1, canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, canvas.clientHeight || window.innerHeight);
    const aspect = w / h;
    // Mid-exit, three.js restores the canvas size itself (and refuses resizes).
    if (!this.renderer.xr.isPresenting) this.renderer.setSize(w, h, false);
    // Portrait phones get a taller view so the horizontal view stays at least ~50°.
    this.camera.fov = aspect >= 1 ? 60 : Math.min(100, (2 * Math.atan(Math.tan(25 * DEG) / aspect)) / DEG);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    for (const listener of this.resizeListeners) listener();
  }

  private readonly resizeListeners: (() => void)[] = [];
}
