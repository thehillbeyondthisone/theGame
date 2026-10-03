/** WebXR's older haptics API, still what Quest Browser implements; not in lib.dom. */
interface PulseActuator {
  pulse?: (value: number, duration: number) => Promise<boolean>;
}

/** Plays one haptic pulse. Quest Browser supports `hapticActuators[0].pulse()`. */
export function pulse(gamepad: Gamepad | undefined, intensity: number, ms: number): void {
  if (!gamepad || intensity <= 0) return;
  const value = Math.min(1, intensity);
  const actuators = (gamepad as unknown as { hapticActuators?: readonly PulseActuator[] }).hapticActuators;
  const actuator = actuators?.[0];
  if (actuator?.pulse) {
    actuator.pulse(value, ms).catch(() => {});
    return;
  }
  gamepad.vibrationActuator
    ?.playEffect('dual-rumble', { duration: ms, strongMagnitude: value, weakMagnitude: value })
    .catch(() => {});
}
