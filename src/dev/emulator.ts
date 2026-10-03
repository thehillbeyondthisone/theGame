/**
 * Dev only (never in the production bundle): emulates a Quest 3 in a desktop
 * browser with Meta's IWER runtime, its DevUI overlay (move the headset, hands and
 * controllers) and a synthetic scanned room for mixed reality.
 * The device is exposed as `window.xrDevice` so scripted tests can drive it via
 * `xrDevice.remote.dispatch(...)`.
 */
export async function installEmulator(room: string): Promise<void> {
  const [{ XRDevice, metaQuest3 }, { DevUI }, { SyntheticEnvironmentModule }] = await Promise.all([
    import('iwer'),
    import('@iwer/devui'),
    import('@iwer/sem'),
  ]);
  const device = new XRDevice(metaQuest3);
  // Desktop Chrome exposes its own navigator.xr (with no headset); take over anyway.
  device.installRuntime({ forceInstall: true });
  device.installDevUI(DevUI);
  device.installSEM(SyntheticEnvironmentModule);
  await device.sem?.loadDefaultEnvironment(room);
  Object.assign(window, { xrDevice: device });
}
