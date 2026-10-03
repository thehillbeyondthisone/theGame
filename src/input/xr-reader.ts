import { rotate, set, vec3 } from '../sim/vec3';
import { type ControllerFrame, type HandFrame, type Handedness, type InputFrame, JOINT_NAMES } from './types';

const FORWARD = { x: 0, y: 0, z: -1 };

/** Batch joint query (WebXR Hand Input); supported by Quest Browser, missing from @types/webxr. */
interface XRFrameWithFillPoses extends XRFrame {
  fillPoses?(spaces: XRSpace[], baseSpace: XRSpace, transforms: Float32Array): boolean;
}

/**
 * Reads an XRFrame into the plain-data InputFrame. The only input code that
 * touches WebXR objects; everything downstream is testable without a headset.
 */
export class XRReader {
  /** Gamepads by hand, for haptics. Refreshed every frame. */
  readonly gamepads: Partial<Record<Handedness, Gamepad>> = {};
  private readonly jointSpaces = new WeakMap<XRHand, XRJointSpace[]>();
  private readonly matrices = new Float32Array(JOINT_NAMES.length * 16);
  private readonly head = { pos: vec3(), quat: { x: 0, y: 0, z: 0, w: 1 }, forward: vec3(0, 0, -1) };

  read(frame: XRFrame, ref: XRReferenceSpace, input: InputFrame): void {
    const viewer = frame.getViewerPose(ref);
    if (viewer) {
      const { position: p, orientation: o } = viewer.transform;
      set(this.head.pos, p.x, p.y, p.z);
      Object.assign(this.head.quat, { x: o.x, y: o.y, z: o.z, w: o.w });
      rotate(this.head.forward, FORWARD, this.head.quat);
      input.head = this.head;
    } else {
      input.head = null;
    }

    for (const side of ['left', 'right'] as const) {
      input[side].hand.tracked = false;
      input[side].controller.tracked = false;
      delete this.gamepads[side];
    }

    for (const source of frame.session.inputSources) {
      const side = source.handedness;
      if (side !== 'left' && side !== 'right') continue;
      if (source.hand) this.readHand(frame, ref, source.hand, input[side].hand);
      else if (source.gamepad) this.readController(frame, ref, source, input[side].controller);
    }
  }

  private readHand(frame: XRFrame, ref: XRReferenceSpace, hand: XRHand, out: HandFrame): void {
    let spaces = this.jointSpaces.get(hand);
    if (!spaces) {
      spaces = JOINT_NAMES.map((name) => hand.get(name)).filter((s): s is XRJointSpace => s !== undefined);
      this.jointSpaces.set(hand, spaces);
    }
    if (spaces.length !== JOINT_NAMES.length) return;

    const m = this.matrices;
    const batch = frame as XRFrameWithFillPoses;
    if (batch.fillPoses) {
      if (!batch.fillPoses(spaces, ref, m)) return;
      for (let i = 0; i < spaces.length; i++) {
        out.joints[i * 3] = m[i * 16 + 12]!;
        out.joints[i * 3 + 1] = m[i * 16 + 13]!;
        out.joints[i * 3 + 2] = m[i * 16 + 14]!;
      }
    } else {
      for (let i = 0; i < spaces.length; i++) {
        const pose = frame.getJointPose?.(spaces[i]!, ref);
        if (!pose) return;
        const p = pose.transform.position;
        out.joints[i * 3] = p.x;
        out.joints[i * 3 + 1] = p.y;
        out.joints[i * 3 + 2] = p.z;
      }
    }
    out.tracked = true;
  }

  private readController(frame: XRFrame, ref: XRReferenceSpace, source: XRInputSource, out: ControllerFrame): void {
    const pose = frame.getPose(source.targetRaySpace, ref);
    const gp = source.gamepad;
    if (!pose || !gp) return;
    const { position: p, orientation: o } = pose.transform;
    set(out.rayOrigin, p.x, p.y, p.z);
    rotate(out.rayDir, FORWARD, o);
    // xr-standard mapping: 0 trigger, 1 squeeze, 3 stick press, 4 A/X, 5 B/Y; axes 2–3 stick.
    out.trigger = gp.buttons[0]?.value ?? 0;
    out.squeeze = gp.buttons[1]?.value ?? 0;
    out.primary = gp.buttons[4]?.pressed ?? false;
    out.secondary = gp.buttons[5]?.pressed ?? false;
    out.stickX = gp.axes[2] ?? 0;
    out.stickY = gp.axes[3] ?? 0;
    out.tracked = true;
    this.gamepads[source.handedness as Handedness] = gp;
  }
}

