import { Raycaster, Vector2, Vector3 } from 'three';
import { Arbiter } from './input/arbiter';
import { Tractor } from './input/controller';
import { MindControl } from './input/mind';
import { PointerControl } from './input/pointer';
import { Telekinesis } from './input/telekinesis';
import { touchAim } from './input/touch-aim';
import { type Handedness, createInputFrame } from './input/types';
import { XRReader } from './input/xr-reader';
import { AudioFeedback } from './platform/audio';
import { pulse } from './platform/haptics';
import { loadBest, saveBest } from './platform/records';
import { type PlayFrame, clampToComfort, makePlayFrame, screenLimits } from './sim/comfort';
import { createIntent, releasePull } from './sim/intent';
import { type PlayMode, type ScoreRun, startScoreRun } from './sim/run';
import { tuning } from './sim/tuning';
import { addScaled, copy, distance, lerp, normalize, set, sub, vec3 } from './sim/vec3';
import { type World, createWorld, resetDisc, stepWorld } from './sim/world';
import { Beams } from './view/beams';
import { DiscView } from './view/disc-view';
import { HoopView } from './view/hoop-view';
import { FrameStats, Hud } from './view/hud';
import { LightGuard } from './view/light-guard';
import { PALETTE, rgb } from './view/palette';
import { Reticle } from './view/reticle';
import { DESKTOP_EYE, Stage } from './view/stage';

export interface AppOptions {
  /** Show the performance panel (toggle with H, or B/Y on a controller). */
  hud: boolean;
  /** Flat-screen stats can be hidden independently of the headset panel. */
  screenHud?: boolean;
  seed: number;
  /** Called when the headset session ends, so the page can show the landing again. */
  onExitXR: () => void;
  onScreenState?: (state: ScreenState) => void;
  onScreenReward?: (text: string, perfect: boolean) => void;
}

export interface ScreenState {
  run: number;
  level: number;
  streak: number;
  paused: boolean;
  scoreRun: ScoreRun;
  best: number;
  newBest: boolean;
  aim: { x: number; y: number; aligned: boolean } | null;
}

interface ScheduledPulse {
  at: number;
  side: Handedness;
  intensity: number;
  ms: number;
}

const AMBER = rgb(PALETTE.amber);
const GOLD = rgb(PALETTE.gold);
const bend = vec3();

/**
 * Runs the game: reads input, lets the arbiter pick a control mode, steps the
 * deterministic simulation at a fixed rate, and presents the result.
 */
export class App {
  private readonly stage: Stage;
  private world: World;
  private readonly intent = createIntent();
  private readonly input = createInputFrame();
  private readonly reader = new XRReader();
  private readonly audio = new AudioFeedback();
  private readonly mind = new MindControl();
  private readonly hands = new Telekinesis();
  private readonly tractor = new Tractor();
  private readonly pointer = new PointerControl();
  private readonly arbiter = new Arbiter();
  private readonly guard = new LightGuard(2);
  private readonly discView = new DiscView();
  private readonly hoopView = new HoopView();
  private readonly beams = new Beams();
  private readonly reticle = new Reticle();
  private readonly hud = new Hud();
  private readonly stats = new FrameStats();
  private readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly projected = new Vector3();
  private best = loadBest();
  private bestBeforeRun = this.best;
  private recorded = false;
  private readonly aim = { x: 0, y: 0, aligned: false };
  private readonly pointers = new Map<number, { x: number; y: number; touch: boolean }>();
  private readonly pulses: ScheduledPulse[] = [];
  private session: XRSession | null = null;
  /** False until the play frame has been placed at the player's head. */
  private anchored = true;
  private paused = false;
  private playing = false;
  private screenPaused = false;
  private depthDirection = 0;
  private accumulator = 0;
  private lastTime = -1;
  private mindRamp = 1;
  private pinchSpan = 0;
  private wheel = 0;
  private hudVisible: boolean;
  private prevPrimary = false;
  private prevSecondary = false;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly options: AppOptions,
  ) {
    this.stage = new Stage(canvas);
    this.hudVisible = options.hud;
    this.world = createWorld(this.desktopFrame(), options.seed);
    this.stage.placePattern(this.world.frame);
    this.hud.place(this.world.frame);
    // On a flat screen the play volume is whatever the view can show.
    this.stage.onResize(() => {
      if (!this.session) {
        Object.assign(this.world.frame.limits, this.desktopFrame().limits);
        this.clearScreenInput();
        clampToComfort(this.world.disc.pos, this.world.disc.pos, this.world.frame);
        copy(this.world.disc.prevPos, this.world.disc.pos);
        clampToComfort(this.world.hoop.center, this.world.hoop.center, this.world.frame, 0.8, 1.9);
        clampToComfort(this.world.hoop.home, this.world.hoop.home, this.world.frame, 0.8, 1.9);
      }
    });
    this.stage.scene.add(this.discView.group, this.discView.captureRoot, this.hoopView.root, this.hoopView.captureRoot, this.beams.mesh, this.reticle.mesh, this.hud.mesh);
    this.bindPointer(canvas);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('blur', () => this.clearScreenInput());
    document.addEventListener('visibilitychange', () => {
      this.clearScreenInput();
      if (document.hidden && this.playing && !this.session && this.world.scoreRun.phase === 'playing') this.screenPaused = true;
      this.accumulator = 0;
      this.lastTime = -1;
    });
    this.stage.renderer.setAnimationLoop(this.frame);
  }

  /** Flat-screen play: mouse or touch drags the disc. */
  play(mode: PlayMode = 'sprint'): void {
    this.enableAudio();
    this.clearScreenInput();
    this.world = createWorld(this.desktopFrame(), this.options.seed, mode);
    this.best = Math.max(this.best, loadBest());
    this.bestBeforeRun = this.best;
    this.recorded = false;
    this.discView.clearCapture();
    this.hoopView.clearCapture();
    this.playing = true;
    this.screenPaused = false;
    this.paused = false;
    this.accumulator = 0;
    this.lastTime = -1;
  }

  resetScreenDisc(): void {
    if (this.world.scoreRun.phase !== 'playing' || this.world.captureRemaining > 0) return;
    this.clearScreenInput();
    this.world.streak = 0;
    this.world.scoreRun.multiplier = 1;
    this.world.scoreRun.shotClipped = true;
    resetDisc(this.world);
  }

  toggleScreenPause(): void {
    if (this.world.scoreRun.phase !== 'playing') return;
    this.enableAudio();
    this.screenPaused = !this.screenPaused;
    this.clearScreenInput();
    this.accumulator = 0;
    this.lastTime = -1;
  }

  setScreenDepth(direction: number): void {
    if (!this.playing || this.session || this.screenPaused || this.world.scoreRun.phase !== 'playing') return;
    if (direction === 0 && this.pointers.size === 0) this.pointer.reset();
    if (direction !== 0 && this.depthDirection === 0 && this.pointers.size === 0) {
      // A depth button also works by itself, along the disc's current direction.
      copy(this.input.pointer.rayOrigin, this.stage.camera.position);
      normalize(this.input.pointer.rayDir, sub(this.input.pointer.rayDir, this.world.disc.pos, this.stage.camera.position));
    }
    this.depthDirection = direction;
  }

  enableAudio(): void {
    this.audio.enable();
  }

  async enterXR(session: XRSession): Promise<void> {
    this.enableAudio();
    this.clearScreenInput();
    this.session = session;
    this.paused = false;
    session.addEventListener('end', this.onSessionEnd);
    // Opening the system menu blurs the session; the game pauses until you're back.
    session.addEventListener('visibilitychange', () => {
      this.paused = session.visibilityState !== 'visible';
    });
    await this.stage.renderer.xr.setSession(session);
    this.stage.setLook(session.environmentBlendMode === 'opaque' ? 'vr' : 'ar');
    this.anchored = false;
    // Recentering (holding the Meta button) moves the origin: re-anchor play to the head.
    this.stage.renderer.xr.getReferenceSpace()?.addEventListener('reset', () => {
      this.anchored = false;
    });
    if (session.supportedFrameRates?.includes(90)) {
      session.updateTargetFrameRate?.(90).catch(() => {});
    }
  }

  private readonly onSessionEnd = (): void => {
    this.session = null;
    this.paused = false;
    this.stage.resetCamera();
    this.stage.setLook('desktop');
    this.anchor(this.desktopFrame());
    this.options.onExitXR();
  };

  private desktopFrame(): PlayFrame {
    const v = this.stage.viewLimits();
    return makePlayFrame(vec3(0, DESKTOP_EYE, 0), vec3(0, 0, -1), screenLimits(v.yaw, v.up, v.down));
  }

  private anchor(frame: PlayFrame): void {
    this.world = createWorld(frame, this.options.seed);
    this.stage.placePattern(frame);
    this.hud.place(frame);
    this.accumulator = 0;
    this.anchored = true;
  }

  private readonly frame = (timeMs: number, xrFrame?: XRFrame): void => {
    const cpuStart = performance.now();
    const now = timeMs / 1000;
    const dt = this.lastTime < 0 ? 0 : Math.min(now - this.lastTime, 0.1);
    this.lastTime = now;
    const input = this.input;
    input.time = now;
    input.dt = dt;

    const xr = this.session !== null && xrFrame !== undefined;
    if (this.session && xrFrame) {
      const ref = this.stage.renderer.xr.getReferenceSpace();
      if (ref) this.reader.read(xrFrame, ref, input);
      if (!this.anchored && input.head) this.anchor(makePlayFrame(input.head.pos, input.head.forward));
    } else {
      input.head = null;
      this.readPointer();
    }

    if (!this.paused && !document.hidden && this.anchored && !(this.playing && !xr && this.screenPaused)) {
      this.control(xr, dt);
      this.simulate(dt);
    }
    this.react(now);
    this.present(now, xr);
    this.stage.render();
    this.stats.tick(now, performance.now() - cpuStart);
  };

  private control(xr: boolean, dt: number): void {
    const { input, world, intent } = this;
    const mindOn = xr && this.mind.update(input, world);
    const handsOn = xr && this.hands.update(input, world, intent);
    const beamOn = xr && this.tractor.update(input, world, intent);
    const pointerOn = !xr && this.playing && this.pointer.update(input, world, intent);

    const prev = this.arbiter.mode;
    const { mode, mindRamp } = this.arbiter.decide(
      { xr, controller: beamOn, hands: handsOn, mind: mindOn, pointer: pointerOn },
      dt,
    );
    this.mindRamp = mindRamp;

    // Only the continuous pull comes from the driver; throws and pushes from any
    // adapter are already in the intent.
    releasePull(intent);
    intent.mode = mode;
    if (mode === 'controller') this.tractor.drive(intent);
    else if (mode === 'hands') this.hands.drive(intent);
    else if (mode === 'pointer') this.pointer.drive(intent);
    else if (mode === 'mind') {
      // While head steering waits out a throw, keep its depth matched to the disc.
      if (prev !== 'mind' || mindRamp === 0) this.mind.syncDepth(world, input);
      this.mind.drive(intent, mindRamp);
    }

    if (xr) this.readButtons();
  }

  private simulate(dt: number): void {
    const { step, maxStepsPerFrame } = tuning.sim;
    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= step && steps < maxStepsPerFrame) {
      stepWorld(this.world, this.intent, step);
      this.accumulator -= step;
      steps++;
    }
    // After a hitch, drop the backlog instead of spiraling.
    if (steps === maxStepsPerFrame) this.accumulator = Math.min(this.accumulator, step);
  }

  private react(now: number): void {
    for (const e of this.world.events) {
      if (e.type === 'hoop') {
        this.hoopView.onPass(e.at, e.normal, e.radius, now, this.guard);
        this.discView.onCapture(e.at, e.normal, now);
        this.audio.sink(e.streak, e.perfect, this.world.scoreRun.multiplier);
        this.options.onScreenReward?.(`${e.perfect ? 'Perfect' : 'Sink'} +${e.points}`, e.perfect);
        this.heartbeat(now);
      } else if (e.type === 'clip') {
        this.hoopView.onClip(now);
        this.audio.rim(e.speed);
        this.options.onScreenReward?.('Rim · steady, try again', false);
        for (const side of ['left', 'right'] as const) this.pulses.push({ at: now, side, intensity: 0.25, ms: 20 });
      }
    }
    this.world.events.length = 0;
    if (!this.recorded && this.world.scoreRun.phase === 'finished') {
      this.best = saveBest(this.world.scoreRun, this.best);
      this.recorded = true;
      this.clearScreenInput();
      this.audio.finish();
    }

    for (const h of this.tractor.haptics) pulse(this.reader.gamepads[h.side], h.intensity, h.ms);
    this.tractor.haptics.length = 0;
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i]!;
      if (now < p.at) continue;
      pulse(this.reader.gamepads[p.side], p.intensity, p.ms);
      this.pulses.splice(i, 1);
    }
  }

  /** Two beats, 180 ms apart, on both controllers (docs/tuning.md). */
  private heartbeat(now: number): void {
    for (const side of ['left', 'right'] as const) {
      this.pulses.push({ at: now, side, intensity: 0.8, ms: 50 }, { at: now + 0.18, side, intensity: 0.5, ms: 70 });
    }
  }

  private present(now: number, xr: boolean): void {
    // The landing page shows only the turning disc; the hoop and stats appear once you play.
    const inPlay = this.playing || this.session !== null;
    this.stage.showPattern(inPlay);
    this.discView.update(this.world.disc, this.accumulator / tuning.sim.step);
    this.discView.updateCapture(now);
    this.hoopView.root.visible = inPlay;
    this.hoopView.update(this.world.hoop, now);
    const disc = this.discView.group.position;
    const mode = this.arbiter.mode;

    this.beams.begin();
    const hand = mode === 'hands' ? this.hands.active : null;
    if (hand) {
      // Tendrils of light from each fingertip, bowing out of the palm.
      const pinch = hand.grip === 'pinch';
      for (let i = 0; i < hand.tips.length; i++) {
        const tip = hand.tips[i]!;
        addScaled(bend, lerp(bend, tip, disc, 0.35), hand.normal, 0.06);
        const seed = i + (hand.handedness === 'left' ? 5 : 0);
        this.beams.add(tip, bend, disc, AMBER, pinch ? 0.85 : 0.5, pinch ? 0.005 : 0.0035, seed);
      }
    }
    const beam = mode === 'controller' ? this.tractor.active : null;
    if (beam) {
      // The beam leaves the controller straight, then bends onto the disc.
      addScaled(bend, beam.origin, beam.dir, distance(beam.origin, disc) * 0.5);
      this.beams.add(beam.origin, bend, disc, GOLD, 0.35 + 0.5 * beam.pressure, 0.008, 11);
    }
    this.beams.finish(now);

    this.reticle.update(mode === 'mind', this.mind.target, this.input.head?.pos ?? null, this.mind.focus, this.mindRamp);

    this.hud.mesh.visible = this.hudVisible && inPlay && (xr || this.options.screenHud !== false);
    if (this.hud.mesh.visible) this.hud.draw(now, this.hudLines(xr));
    if (!xr && this.playing) {
      const scoreRun = this.world.scoreRun;
      this.options.onScreenState?.({ run: this.world.run, level: this.world.level, streak: this.world.streak,
        paused: this.screenPaused, scoreRun, best: this.best,
        newBest: scoreRun.score > this.bestBeforeRun,
        aim: this.pointers.size === 1 && this.pointers.values().next().value?.touch && !this.screenPaused && scoreRun.phase === 'playing' ? this.aim : null });
    }
  }

  private hudLines(xr: boolean): string[] {
    const s = this.stats;
    const info = this.stage.renderer.info.render;
    const rate = this.session?.frameRate;
    const multiview = xr ? (this.stage.renderer.xr.isMultiview ? 'on' : 'off') : 'n/a';
    const w = this.world;
    return [
      `${s.fps.toFixed(0)}${rate ? `/${rate}` : ''} fps · cpu ${s.cpuAvg.toFixed(1)} ms (max ${s.cpuMax.toFixed(1)})`,
      `${info.calls} draws · ${(info.triangles / 1000).toFixed(1)}k tris · multiview ${multiview}`,
      `${this.arbiter.mode} · focus ${(this.mind.focus * 100).toFixed(0)}% · depth ${this.mind.depth.toFixed(2)} m`,
      `${w.scoreRun.score} pts ×${w.scoreRun.multiplier} · LEVEL ${w.level}/10 · streak ${w.streak}${this.paused ? ' · paused' : ''}`,
    ];
  }

  private readButtons(): void {
    const { left, right } = this.input;
    const primary = left.controller.primary || right.controller.primary;
    const secondary = left.controller.secondary || right.controller.secondary;
    if (primary && !this.prevPrimary) resetDisc(this.world);
    if (secondary && !this.prevSecondary) this.hudVisible = !this.hudVisible;
    this.prevPrimary = primary;
    this.prevSecondary = secondary;
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    if (key === 'h') this.hudVisible = !this.hudVisible;
    else if (key === 'r') this.resetScreenDisc();
    else if (key === ' ' && this.playing && !this.session && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      this.toggleScreenPause();
    }
  };

  private bindPointer(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('contextmenu', (e) => {
      if (this.playing && !this.session) e.preventDefault();
    });
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.playing || this.session || this.screenPaused || this.world.scoreRun.phase === 'finished' || (e.pointerType === 'mouse' && e.button !== 0)) return;
      startScoreRun(this.world.scoreRun);
      canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' });
      this.pinchSpan = this.span();
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX;
      p.y = e.clientY;
      if (this.pointers.size >= 2) {
        // Two-finger spread pushes the disc away; pinch brings it closer.
        const span = this.span();
        this.wheel += (span - this.pinchSpan) / 40;
        this.pinchSpan = span;
      }
    });
    const release = (e: PointerEvent): void => {
      const firstId = this.pointers.keys().next().value;
      this.pointers.delete(e.pointerId);
      this.pinchSpan = this.span();
      if (firstId === e.pointerId && this.pointers.size > 0) this.pointer.reset();
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', () => this.clearScreenInput());
    canvas.addEventListener('lostpointercapture', (e) => {
      if (this.pointers.has(e.pointerId)) this.clearScreenInput();
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.playing || this.session || this.screenPaused) return;
        e.preventDefault();
        this.wheel -= Math.sign(e.deltaY);
      },
      { passive: false },
    );
  }

  private clearScreenInput(): void {
    const ids = [...this.pointers.keys()];
    this.pointers.clear();
    const canvas = this.stage.renderer.domElement;
    for (const id of ids) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    this.pinchSpan = 0;
    this.wheel = 0;
    this.depthDirection = 0;
    this.input.pointer.down = false;
    this.input.pointer.depthRate = 0;
    this.input.pointer.touchAim = false;
    this.pointer.reset();
    releasePull(this.intent);
    this.intent.throwBoost = 1;
    set(this.intent.impulse, 0, 0, 0);
  }

  private span(): number {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private readPointer(): void {
    const p = this.input.pointer;
    const first = this.pointers.values().next().value;
    p.down = first !== undefined || this.depthDirection !== 0;
    p.touchAim = first?.touch === true && this.pointers.size === 1;
    p.depthRate = this.depthDirection * tuning.pointer.depthSpeed;
    if (first) {
      const rect = this.stage.renderer.domElement.getBoundingClientRect();
      // Support touching the mouth as well as aiming the marker above a thumb.
      // Depth assistance still requires a held gesture; there's no unattended scoring.
      let x = first.x - rect.left;
      let y = first.y - rect.top;
      this.projected.set(this.world.hoop.center.x, this.world.hoop.center.y, this.world.hoop.center.z).project(this.stage.camera);
      const mouthX = (this.projected.x + 1) * rect.width / 2;
      const mouthY = (1 - this.projected.y) * rect.height / 2;
      this.aim.aligned = false;
      if (p.touchAim && p.depthRate === 0 && this.wheel === 0 && this.world.captureRemaining === 0) {
        const assisted = touchAim(x, y, mouthX, mouthY, rect.width, rect.height);
        x = assisted.x;
        y = assisted.y;
        this.aim.aligned = assisted.aligned;
      } else if (first.touch) {
        y -= Math.min(52, rect.height * 0.09);
      }
      this.aim.x = Math.max(12, Math.min(rect.width - 12, x));
      this.aim.y = Math.max(12, Math.min(rect.height - 12, y));
      this.ndc.set((this.aim.x / rect.width) * 2 - 1, -(this.aim.y / rect.height) * 2 + 1);
      this.raycaster.setFromCamera(this.ndc, this.stage.camera);
      copy(p.rayOrigin, this.raycaster.ray.origin);
      copy(p.rayDir, this.raycaster.ray.direction);
    }
    p.wheel = this.wheel;
    this.wheel = 0;
  }
}
