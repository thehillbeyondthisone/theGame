# THE GAME: plan

A Quest 3 WebXR homage to TNG's "The Game".

Appendices: [A. Level file format](docs/level-format.md) · [B. Starting tuning values](docs/tuning.md) · [Decisions](docs/decisions.md) · [How to run it](README.md)

**Visual direction update (2026-09-28):** the user supplied footage from the actual episode and specified that its visuals must be matched exactly. The [private episode baseline](docs/visual-baseline.md) governs every visual comparison and supersedes conflicting visual suggestions in this earlier plan. The copyrighted source and decoded frames are kept out of the public repository. Existing and proposed effects have no fidelity approval until compared against that local source.

**Status (2026-09-27): M0 in progress.** Done: project setup, the SDK trial (decided: plain super-three, see [D1](docs/decisions.md)), all four input modes, and a LAN dev server for testing on the headset. All four modes are verified in Meta's desktop headset emulator. The first test on a real Quest found a super-three shader bug that only appears with multiview; it's fixed ([D4](docs/decisions.md)) but not yet re-tested on the headset. Left: re-test on the Quest, confirm 90 fps there, and a public URL on Cloudflare Pages.

**Gameplay priority (2026-09-28): M1's hands-free core loop.** The first episode-based visual pass received positive user feedback. Mind mode advances the disc in depth when gaze holds near the funnel mouth; a missed disc can return for another try without a controller. Rim hits now rebound with a small visual, audio, and haptic cue. A sink plays its full spiral before the disc returns. Ten spatial layouts progress from broad static mouths to smaller, gently moving ones, then repeat as a new run. These are rough level variations, not the later timing, routing, or scoring mechanics. The next gameplay decision is headset feel: tune aim, rebound, pacing, and replay desire before expanding M1.

## The big idea

The device in the episode is essentially a Quest 3. The game appears over the real world, and people play it sitting still, steering by thought. So:

- **Mixed reality comes first.** With color passthrough, the disc and funnels float in your actual room.
- **"Mind mode" steers hands-free with your head.** Quest 3 has no eye tracking, but a smoothed head direction feels like "thinking where you look." Hand-tracking "telekinesis" and controllers give you more power.
- **The takeover becomes literal.** The Game takes over your room. Vines of light spread over your walls and funnels sprout from them. Then portals open onto a starship full of crew who can't stop playing, until your room is gone.
- **It spreads by link.** The web is the perfect way to pass it around.

(Canon note: it's the Ktarians' game. Riker just picks it up on Risa.)

## Pillars

1. **Instant:** under 20 s from opening the URL to the first sink. No install, no account, no text tutorial.
2. **Every sink is a small ecstasy:** the capture spiral and the reward are the product.
3. **Reality is the level.**
4. **It spreads.**
5. **Kind by design:** no dark patterns, safe for photosensitive players, and breaks suggested from inside the story.

## Core loop

You steer the disc toward a funnel mouth. It either goes in or bounces off the rim. If it goes in, it spirals down, sinks and fires the Pulse. Then "LEVEL n" advances on its own. Levels last 15–60 s.

### Controls

All four modes feed the same internal input, so the simulation doesn't care which device you use.

| Mode | How it works |
| --- | --- |
| **Mind** (default while your hands are idle) | Where you look pulls the disc on a damped spring. Holding your gaze on a funnel also draws it forward through the mouth, with a narrow aim window. Focus makes the pull stronger and steadier; leaning remains manual depth control. |
| **Telekinesis** (hand tracking) | An open palm pulls, a pinch holds and letting go throws, with a little aim assist. A palm push shoves the disc away. Light tendrils stream from your fingertips. |
| **Controllers** | The trigger is a tractor beam, the stick sets depth and a flick throws. Haptics let you feel it. |
| **Phone/desktop fallback** | Drag with mouse or touch. It has a built-in "open on your headset" pitch. |

### The capture (the part to over-invest in)

- **Approach:** a gentle magnet near the mouth pulls the disc in ("the funnel wants you"). Its strength doubles as the difficulty and accessibility setting.
- **Entry:** a clean entry sinks. If the rim is never touched, it's a **Swish**. Clipping the rim bounces the disc off with a bell-like clank. In later levels, discs that come in too fast skip out.
- **Spiral:** the disc keeps its angular momentum, so it whirls faster as the funnel narrows, like a coin in a wishing-well vortex. The pitch rises and the rings pulse in time. A spiral lasts 0.8–2 s, and three or more loops earns a **Whirl** bonus.

### The Pulse

The Pulse stands in for the episode's "pleasure centers" jolt:

- **Every sink:** an instant sub-bass thump and a warm chord on the beat, a heartbeat on the controller, and the funnel blossoming. A sphere of warm light sweeps through your room, which looks sun-warmed for a moment.
- **Euphoria (combo):** each consecutive sink adds music layers and more intensity.
- **Crescendo:** now and then a sink triggers a jackpot: a key change and light motes you can catch. The odds favor skilled play. It's the slot-machine hook the episode is about, used knowingly.
- **Rapture (maximum combo):** 6 s of slow motion, with wider funnel mouths and light flowing across your actual walls. Think Tetris Effect's "Zone."
- **Rule:** rewards scale with skill, never with time spent or money.

**Craving** puts pressure on Endless and Daily runs. It rises constantly and each sink satisfies it. As it climbs, the world loses color and faint static creeps in. When it maxes out, the run ends ("withdrawal"). That gives pressure without a visible timer.

### New mechanics arrive every 3–5 levels

- **Timing and order:** mouths that open and close on the beat, and numbered sequences.
- **Routing:** color keys, gravity wells, currents, portals between funnels, and bumpers (in MR, your real walls and table).
- **Juggling:** several discs at once, and splitters that turn one disc into three.
- **Funnels with a mind of their own:**
  - *shy* funnels turn away when you look straight at them, so you play with peripheral vision
  - *temptations* give big rewards but spike Craving
  - *hungry* funnels chase your disc
- **Boss towers** every 10 levels.

## Modes and replayability

### Campaign: "The Takeover" (about 2.5 h, 50 levels, 2 endings)

| Act | Reality | What happens |
| --- | --- | --- |
| Prologue: "The Gift" | Web page, then your room | A gift from a pleasure world. "Put it on." |
| I (1–10) | Your room | Pure delight. A faint strand of light stays behind after each level. |
| II (11–20) | ~90% real | Vines cover your walls, funnels grow from them and your table becomes a bumper. The Game's messages turn affectionate, and a garbled voice tries to break through. |
| III (21–30) | ~60% real | Portals in your walls show crew sitting motionless, faces lit by their headsets. They sigh in unison every time you sink a disc. An immune young engineer finally gets through. |
| IV (31–40) | Full VR | Funnels hover over the command-deck consoles. The twist: every sink was a ship command. You can keep obeying or start deliberately misplaying. |
| V (41–50) | VR, then reality | Hungry funnels hunt your disc. You feed cyan light into the Core on the beat. A slow dawn, never a strobe, wakes the crew, and headsets come off one by one as your room fades back in. |
| Epilogue | Your room | A tiny disc appears on your table: "LEVEL 1?" |

- **Two endings:** *Dawn* if you resisted, *Bliss* if you never did (your room stays transformed).
- **New Game+, "The Game Remembers":** the difficulty adapts to you, framed as "the Game is learning what you like."

### Other modes and systems

- **Endless ("One More Level"):** generated levels with Craving pressure. After each boss tower you pick one of three Perks, roguelite-style.
- **Daily:** everyone gets the same 7 levels and one scored try. It produces a Wordle-style share card: `THE GAME · Daily 212 · 🟠🟠⚪🌟🟠🌟🟠 · 48,210`.
- **Zen:** no score and no pressure.
- **Pass It On:** a party mode where the headset gets passed around, just like in the episode. Everyone else watches through Quest casting.
- **Progression:**
  - cosmetics, including reward palettes that change both the colors and the musical mode
  - optional difficulty modifiers that multiply your score
  - achievements like "I Can Stop Any Time" (quit during Rapture)
- **Share the Game:** anonymous share links grow your "Spread," shown as a constellation of the people you've passed it to. No personal data is collected.
- **Stretch goals:** live 1v1 duels, and a level editor that stores levels in the URL.

## Mixed reality

- **Room scan is optional.** Walls, tables and floor come from the headset's room scan. The game stays fully playable without one, using stand-in walls.
- **Real surfaces join in.** Funnels grow on real walls, and walls and tables become bumpers.
- **Light spill.** Your room's shape is drawn with a light-only shader, so the disc and the Pulse appear to light up your real walls. It's cheap, and the most striking MR effect.
- **Occlusion.** Holograms hide behind real furniture, and invisible shapes follow your tracked hands so your hands pass in front of the disc.
- **Persistence.** Portals are cut into your walls, and saved anchors keep the overgrowth still in your room next session.
- **Seamless VR.** VR scenes are drawn inside the same mixed-reality session, so going from reality to VR is a dissolve, never a restart.

## Look and sound

- **Style:** exact visual reconstruction of the [supplied episode clip](docs/visual-baseline.md): thin red-orange spiral discs, shaded violet/lavender funnels with flared mouths and tapering twisting tails, and a receding field of filled orange circles composited over the scene.
- **Visual reference:** the supplied clip is authoritative for every comparison, including animation. Tetris Effect, Rez Infinite, Cubism and First Encounters remain prior experience/gameplay inspirations only.
- **Standout scenes:**
  - the first Pulse in your own room
  - a bank shot off your real wall
  - the lounge of sighing crew: identical, faceless figures that are eerie and cheap to render
  - the Core
  - the Dawn
- **Audio:** 3D positional sound and code-generated effects, including a "singing" disc hum and a rising spiral whirr. Adaptive music layers build with your combo, and sinks land on the beat.

## Onboarding, comfort and safety

**The first 60 seconds:** a page with one turning disc and the words "A gift," and a *Put it on* button. In your room, a line of amber light sweeps across your vision and two faint beams converge on your eyes, a nod to the show's emitter. A funnel unfurls, the disc follows your gaze, it sinks, the Pulse fires, and "LEVEL 2" appears. No instructions; hints appear only after about 20 s of struggling.

**Comfort:**

- no artificial movement; play seated or standing
- everything stays 0.6–2.2 m away and within ±55° of straight ahead
- the game pauses when you open the system menu

**Photosensitivity (non-negotiable):** the episode's cure is a flashing light, and ours isn't.

- at most about 2 brightness pulses per second, each easing in over at least 100 ms
- no full-view red flashes
- a "calm visuals" setting
- a warning on the landing page

**Accessibility:**

- fully hands-free or one-handed play
- symbols as well as colors for color-blind players
- adjustable assist and game speed
- a no-fail option
- subtitles

## Tech architecture

| Layer | Choice | Why |
| --- | --- | --- |
| Build | TypeScript + Vite | |
| Rendering | three.js, using Supermedium's super-three fork: `WebGLRenderer({ multiviewStereo: true })` | Renders both eyes in one pass with anti-aliasing. Meta reports 25–50% less CPU use in CPU-limited scenes. Standard three.js r186 doesn't support this in its WebGL renderer. |
| Framework | Meta Immersive Web SDK (1.0 release candidate, Sept 2026); confirm in week 1 | Built for Quest: hand/controller input, room understanding, in-VR menus, and a desktop headset emulator. Uses super-three; MIT license. |
| Physics | Custom, deterministic | Full control over feel, plus replays, fair Dailies and server-side score checks. |
| Audio / saves | Web Audio / IndexedDB, saved on the device with no account | |
| Hosting | Cloudflare Pages with an offline cache; Workers + D1 later for leaderboards | WebXR requires HTTPS; repeat visits launch instantly. |

**Keep the framework swappable.** Game logic never imports the rendering framework. If Meta's SDK pushes the download over budget, fall back to plain super-three.

> **M0 decision:** the fallback applied. An empty IWSDK world loads 1.67 MB of gzipped JavaScript; all of M0 on plain super-three loads 142 KB. Meta's headset emulator (IWER) is still used for testing. Details in [D1](docs/decisions.md).

**Not WebGPU yet.** Quest's browser added WebGPU for VR only experimentally this year, and three.js's WebGPU VR path can't render both eyes in one pass yet.

**Budgets on Quest 3 at 90 fps:**

- 11.1 ms per frame
- at most 100 draw calls
- a first playable download of 2 MB or less
- to hit this: no full-screen post-processing, glow faked with emissive materials, and funnels, disc, sky and most sound generated in code

**No download:**

- a short HTTPS link and a *Put it on* button
- the browser's own Enter button via `navigator.xr.offerSession()`
- on phones and desktops: a playable version, a QR code, and an *Open on Meta Quest* button using Meta's Web Launch link (`https://www.oculus.com/open_url/?url=…`)

**Testing:**

- a bot that plays generated levels to prove they're solvable and to calibrate difficulty
- automated end-to-end runs in Meta's desktop headset emulator
- an in-headset performance display and live tuning sliders

## Roadmap (about 20 focused weeks, solo with Claude Code)

| # | Milestone | Weeks | Done when |
| --- | --- | --- | --- |
| M0 | Foundations: setup, SDK trial, all 4 input modes, deploy | 1 | A disc in your room at 90 fps, controllable 4 ways, from a URL |
| M1 | Find the fun: physics, capture and spiral, 10 rough levels | 2 | At least 4 of 5 testers replay without being asked |
| M2 | The Pulse: visuals, music, haptics, combo systems | 2 | 90 fps holds during Rapture |
| M3 | Content engine, then Early Access (Endless, Daily, Zen) | 3 | Public URL live |
| M4 | Reality is the level: room features, portals, persistence | 3 | Works in 3+ rooms and with no scan |
| M5 | Campaign, shipped act by act | 5 | At least 2 of 3 outside players get the twist |
| M6–M7 | Progression and social features, then launch polish | 4 | Full release |

### Top risks

- **The core may be too simple.** Nothing gets built on it until M1's "is it fun" test passes.
- **Gaze steering may feel mushy.** Tune it early, and keep hands and controllers available.
- **Quest performance.** Set budgets from day one and test on the headset every week.
- **The campaign may balloon.** The arcade modes ship first and the acts follow as episodes.

## Trademark and copyright

Leave out:

- "Star Trek"
- the show's ship, planet, species and character names, and actor likenesses or voices
- the LCARS interface style, insignia and ship designs
- the show's music and sound effects

Use original designs that evoke the premise. Keep it free if it stays close to the source, and get legal advice before charging for anything.

## Open decisions

1. Keep the name "THE GAME," or choose an original title?
2. Free fan homage or commercial?
3. Launch the arcade modes first as Early Access (recommended), or wait for the campaign?
4. Text only, or recorded voice acting?
5. Composed, generated or mixed music (recommended: mixed)?
6. Full Quest 2 support, or best effort?

## Sources

- Meta – Immersive Web SDK overview · facebook/immersive-web-sdk · IWSDK scene understanding
- Meta – Multiview WebGL rendering · Supermedium super-three fork
- Meta – Mixed reality in Browser · Meta – WebXR Space Warp
- Meta – Web Launch · Meta – Browser release notes
- three.js – WebXRDepthSensing · offerSession on Quest (issue discussion)
- Road to VR – IWSDK AI agent workflow
- Wikipedia – "The Game" (TNG)
