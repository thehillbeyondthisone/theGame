export type ImmersiveMode = 'immersive-ar' | 'immersive-vr';

/**
 * Room features (planes, meshes, anchors, depth) arrive in M4; asking for them now
 * would trigger a spatial-data permission prompt for nothing. 'layers' lets
 * super-three use a projection layer, which multiview rendering needs.
 */
export const SESSION_INIT: XRSessionInit = {
  requiredFeatures: ['local-floor'],
  optionalFeatures: ['hand-tracking', 'layers'],
};

interface XRSystemWithOffer extends XRSystem {
  offerSession?: (mode: XRSessionMode, init?: XRSessionInit) => Promise<XRSession>;
}

/** Mixed reality first; fall back to VR where passthrough isn't available. */
export async function detectImmersiveMode(): Promise<ImmersiveMode | null> {
  const xr = navigator.xr;
  if (!xr) return null;
  for (const mode of ['immersive-ar', 'immersive-vr'] as const) {
    try {
      if (await xr.isSessionSupported(mode)) return mode;
    } catch {
      // Some browsers throw instead of answering false.
    }
  }
  return null;
}

export function requestSession(mode: ImmersiveMode): Promise<XRSession> {
  return navigator.xr!.requestSession(mode, SESSION_INIT);
}

/**
 * Asks the browser to show its own Enter button (Quest Browser supports
 * navigator.xr.offerSession). Resolves with the session if the player accepts.
 */
export function offerSession(mode: ImmersiveMode, onSession: (session: XRSession) => void): void {
  const xr = navigator.xr as XRSystemWithOffer | undefined;
  xr?.offerSession?.(mode, SESSION_INIT)
    .then(onSession)
    .catch(() => {
      // Declined or superseded by our own button; nothing to do.
    });
}

/** Meta's Web Launch link: sends this page to the player's headset. */
export function webLaunchUrl(url: string): string {
  return `https://www.oculus.com/open_url/?url=${encodeURIComponent(url)}`;
}
