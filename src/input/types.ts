import { type Quat, type Vec3, vec3 } from '../sim/vec3';

export type Handedness = 'left' | 'right';

/** The 25 WebXR hand joints, in spec order. Positions are packed xyz in HandFrame.joints. */
export const JOINT_NAMES = [
  'wrist',
  'thumb-metacarpal',
  'thumb-phalanx-proximal',
  'thumb-phalanx-distal',
  'thumb-tip',
  'index-finger-metacarpal',
  'index-finger-phalanx-proximal',
  'index-finger-phalanx-intermediate',
  'index-finger-phalanx-distal',
  'index-finger-tip',
  'middle-finger-metacarpal',
  'middle-finger-phalanx-proximal',
  'middle-finger-phalanx-intermediate',
  'middle-finger-phalanx-distal',
  'middle-finger-tip',
  'ring-finger-metacarpal',
  'ring-finger-phalanx-proximal',
  'ring-finger-phalanx-intermediate',
  'ring-finger-phalanx-distal',
  'ring-finger-tip',
  'pinky-finger-metacarpal',
  'pinky-finger-phalanx-proximal',
  'pinky-finger-phalanx-intermediate',
  'pinky-finger-phalanx-distal',
  'pinky-finger-tip',
] as const satisfies readonly XRHandJoint[];

export interface HandFrame {
  handedness: Handedness;
  tracked: boolean;
  /** 25 joint positions, xyz packed (75 floats), world meters. */
  joints: Float32Array;
}

export interface ControllerFrame {
  handedness: Handedness;
  tracked: boolean;
  rayOrigin: Vec3;
  /** Unit direction of the target ray. */
  rayDir: Vec3;
  trigger: number;
  squeeze: number;
  stickX: number;
  /** Thumbstick Y; −1 is pushed forward (xr-standard mapping). */
  stickY: number;
  /** A/X button. */
  primary: boolean;
  /** B/Y button. */
  secondary: boolean;
}

export interface PointerFrame {
  down: boolean;
  rayOrigin: Vec3;
  rayDir: Vec3;
  /** Accumulated wheel notches since last frame; + is away from you. */
  wheel: number;
  /** Touch-screen play: the disc is flicked into an arc instead of dragged to the funnel. */
  toss: boolean;
  /** Where the pointer is, in screen heights from the view's center; +x right, +y up. */
  x: number;
  y: number;
  /** Manual depth velocity from the screen's Push/Pull controls, m/s. */
  depthRate: number;
}

/** Everything the control adapters read, as plain data. Rebuilt every frame. */
export interface InputFrame {
  time: number;
  dt: number;
  head: { pos: Vec3; quat: Quat; forward: Vec3 } | null;
  left: { hand: HandFrame; controller: ControllerFrame };
  right: { hand: HandFrame; controller: ControllerFrame };
  pointer: PointerFrame;
}

function handFrame(handedness: Handedness): HandFrame {
  return { handedness, tracked: false, joints: new Float32Array(75) };
}

function controllerFrame(handedness: Handedness): ControllerFrame {
  return {
    handedness,
    tracked: false,
    rayOrigin: vec3(),
    rayDir: vec3(0, 0, -1),
    trigger: 0,
    squeeze: 0,
    stickX: 0,
    stickY: 0,
    primary: false,
    secondary: false,
  };
}

export function createInputFrame(): InputFrame {
  return {
    time: 0,
    dt: 0,
    head: null,
    left: { hand: handFrame('left'), controller: controllerFrame('left') },
    right: { hand: handFrame('right'), controller: controllerFrame('right') },
    pointer: { down: false, rayOrigin: vec3(), rayDir: vec3(0, 0, -1), wheel: 0, toss: false, x: 0, y: 0, depthRate: 0 },
  };
}
