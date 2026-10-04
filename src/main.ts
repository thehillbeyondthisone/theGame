import './ui/landing.css';
import { App } from './app';
import { ScreenControls } from './ui/screen-controls';
import type { PlayMode } from './sim/run';
import { type ImmersiveMode, detectImmersiveMode, offerSession, requestSession, webLaunchUrl } from './platform/xr';

const params = new URLSearchParams(location.search);

// Dev only: `?emulate` (or `?emulate=office_small`) fakes a Quest 3 in a desktop browser.
if (import.meta.env.DEV && params.has('emulate')) {
  const { installEmulator } = await import('./dev/emulator');
  await installEmulator(params.get('emulate') || 'living_room');
}

function el<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}

const landing = el('#landing');
const putOn = el<HTMLButtonElement>('#put-on');
const playHere = el<HTMLButtonElement>('#play-here');
const freePlay = el<HTMLButtonElement>('#free-play');
const openQuest = el<HTMLAnchorElement>('#open-quest');
const status = el('#status');

let mode: ImmersiveMode | null = null;
let screenControls: ScreenControls;
const touch = matchMedia('(any-pointer: coarse)').matches;

const app = new App(el<HTMLCanvasElement>('#scene'), {
  hud: params.get('hud') !== '0',
  screenHud: params.has('hud') && params.get('hud') !== '0',
  seed: Number(params.get('seed')) || 1,
  onExitXR: () => {
    screenControls.show(false);
    landing.hidden = false;
    if (mode) offerSession(mode, start);
  },
  onScreenState: (state) => screenControls?.update(state),
  onScreenReward: (text, perfect) => screenControls?.reward(text, perfect),
});
screenControls = new ScreenControls({
  reset: () => app.resetScreenDisc(),
  pause: () => app.toggleScreenPause(),
  depth: (direction) => app.setScreenDepth(direction),
  replay: (mode) => app.play(mode),
});

// Dev only: expose the app for scripted checks in the browser console.
if (import.meta.env.DEV) Object.assign(window, { game: app });

async function start(session: XRSession): Promise<void> {
  screenControls.show(false);
  landing.hidden = true;
  status.textContent = '';
  try {
    await app.enterXR(session);
  } catch (err) {
    landing.hidden = false;
    status.textContent = `Couldn't start: ${(err as Error).message}`;
  }
}

mode = await detectImmersiveMode();
if (mode) {
  const immersive = mode;
  putOn.hidden = false;
  putOn.addEventListener('click', () => {
    app.enableAudio();
    requestSession(immersive).then(start, (err: Error) => {
      status.textContent = `Couldn't start: ${err.message}`;
    });
  });
  // Also light up the browser's own Enter button.
  offerSession(immersive, start);
  playHere.textContent = '60-second run';
  playHere.classList.add('secondary');
} else {
  openQuest.hidden = false;
  openQuest.href = webLaunchUrl(location.href);
}
if (touch) el('#screen-intro').hidden = false;
playHere.hidden = false;
freePlay.hidden = false;
function playScreen(mode: PlayMode): void {
  landing.hidden = true;
  app.play(mode);
  screenControls.show(true);
}
playHere.addEventListener('click', () => playScreen('sprint'));
freePlay.addEventListener('click', () => playScreen('free'));
