/**
 * Live tuning values. Starting points come from docs/tuning.md; this file is the
 * source of truth once a value is in use. Mutable on purpose so in-headset tuning
 * sliders can change it at runtime. Units: meters, seconds, degrees.
 */
export const tuning = {
  sim: {
    step: 1 / 120,
    maxStepsPerFrame: 12,
  },
  disc: {
    radius: 0.075,
    /** Free-flight linear drag, 1/s. */
    drag: 0.6,
    maxSpeed: 6,
    maxThrowSpeed: 5,
    /** Soft spring that pushes the disc back inside the comfort volume, 1/s². */
    boundaryStiffness: 25,
    idleSpin: 1.5, // rev/s
  },
  mind: {
    filterMinCutoff: 1.2, // Hz, at Focus 0
    focusedMinCutoff: 0.35, // Hz, at Focus 1
    filterBeta: 0.6,
    filterDCutoff: 1.0,
    startDepth: 1.2,
    leanDeadZone: 0.02,
    /** Depth speed (m/s) per meter of lean beyond the dead zone. */
    leanGain: 12,
    leanNeutralTau: 3,
    /** Gaze must be near the funnel center to advance automatically in depth. */
    depthAimInnerCos: 0.9986295347545738, // 3°
    depthAimOuterCos: 0.9902680687415704, // 8°
    depthAimBase: 0.35,
    depthThroughMouth: 0.24,
    depthSpeed: 1.4, // m/s, prevents a snap when gaze enters or leaves the cone
    recoverBehind: 0.08,
    recoverAhead: 0.10,
    recoverDepth: 0.3,
    stiffness: [20, 70] as [number, number], // Focus 0 → 1
    dampingRatio: 0.85,
    /** How much of the target's own motion the disc anticipates (0 = floaty, 1 = locked on). */
    lead: 0.5,
    focusCalmDegPerSec: 20,
    focusBusyDegPerSec: 45,
    focusFillSec: 1.2,
    /** After a throw or push, head steering waits this long… */
    graceSec: 1.0,
    /** …then fades back in over this long. */
    rampSec: 0.5,
  },
  hands: {
    pinchOn: 0.018,
    pinchOff: 0.035,
    openOn: 0.85, // mean finger straightness
    openOff: 0.8,
    /** Palm normal · aim direction needed for the open-palm pull. */
    facing: 0.35,
    shoulderDown: 0.13,
    shoulderSide: 0.17,
    /** The hand must be raised at least this close to head height (m below the head). */
    raisedBelowHead: 0.6,
    reach: [0.25, 0.6] as [number, number], // shoulder-to-palm distance…
    depth: [0.6, 2.2] as [number, number], // …maps to this target distance
    openStiffness: 35,
    openDampingRatio: 0.9,
    pinchStiffness: 140,
    pinchDampingRatio: 1.0,
    lead: 1.0,
    throwBoost: 1.6,
    pushMinSpeed: 1.1,
    pushGain: 1.8,
    pushFacing: 0.6,
    pushCooldown: 0.4,
  },
  controller: {
    triggerDeadZone: 0.08,
    stiffness: [30, 90] as [number, number], // trigger pressure 0 → 1
    dampingRatio: 0.9,
    lead: 1.0,
    stickDepthSpeed: 1.6,
    stickDeadZone: 0.15,
    minDepth: 0.3,
    maxDepth: 3.0,
    throwBoost: 1.4,
    flickMinSpeed: 1.2,
    haptics: {
      strainMin: 0.05,
      strainMax: 0.35,
      strainPulseMs: 15,
      strainIntervalMs: 50,
      throw: [0.6, 40] as [number, number],
    },
  },
  pointer: {
    stiffness: 60,
    dampingRatio: 0.9,
    lead: 1.0,
    wheelStep: 0.1,
    depthSpeed: 1.0, // m/s while a screen Push/Pull button is held
    throwBoost: 1.3,
    flickMinSpeed: 1.0,
  },
  /** Touch screens: grab the disc low and near, flick it up, and it flies an arc. */
  toss: {
    /** Where a fresh disc waits: meters ahead of the eye, and below it. */
    restAhead: 0.6,
    restDrop: 0.37,
    /** A held disc follows the finger this far from where it waits, m. */
    reach: 0.15,
    stiffness: 160,
    dampingRatio: 1,
    /** Finger speed is measured over this long before the finger lifts, s. */
    flickWindow: 0.06,
    /** Flick speeds are in screen heights per second. Slower let-gos just drop the disc. */
    minFlick: 0.6,
    minRise: 0.3,
    /** Launch speed (m/s) = speedBase + speedGain × flick speed, up to maxSpeed. */
    speedBase: 1.45,
    speedGain: 0.4,
    maxSpeed: 4.2,
    /** Rise per meter of run at launch. */
    loft: 1.4,
    /** Sideways lean of the throw per unit of the flick's sideways lean, and its limit. */
    sideGain: 0.85,
    maxSide: 1,
    /** Seconds until an arc joins the one a disc thrown from its resting place would fly. */
    rejoin: 0.6,
    /** Lower than real gravity, so the arc is slow enough to read on a small screen. */
    gravity: 5,
    /** How far a near-miss is corrected toward a clean arc (0 = none, 1 = always sinks)… */
    assist: 0.25,
    /** …in full up to this relative error, fading out by the second value. */
    assistFull: 0.2,
    assistFade: 0.45,
    /** A throw is a miss once it falls this far below the eye, flies this far, or takes this long. */
    floor: 0.8,
    range: 3.2,
    maxFlight: 2.5,
  },
  hoop: {
    radius: 0.14,
    /** Up to this far off facing the player, so passes need sideways motion too. */
    maxTurn: 1.2, // tan of ~50°
  },
};

export type Tuning = typeof tuning;
