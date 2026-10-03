# Decisions

Back to [PLAN.md](../PLAN.md).

## D1 · Plain super-three instead of Meta's Immersive Web SDK

M0, 2026-09-27. The plan set the rule in advance: "If Meta's SDK pushes the download over budget, fall back to plain super-three."

Measured with production builds from Vite 8:

| Build | Startup JS, gzipped | Startup JS, raw |
| --- | --- | --- |
| IWSDK `1.0.0-rc.2`, empty world (`features: {}`) plus one mesh | 1.67 MB | 6.5 MB |
| THE GAME M0 on super-three `0.185.0`, everything included | 142 KB | 556 KB |

The JavaScript budget is 400 KB gzipped. IWSDK alone is about 4× over it before any game code, and most of that is JavaScript the headset must parse at startup. Its package marks most of its modules as having side effects, so tree-shaking doesn't help. It also pins its own super-three (`0.181.0`).

**Kept from Meta's stack:** the IWER headset emulator, its DevUI and the Synthetic Environment Module, used directly for desktop testing.

**Given up:** IWSDK's scene understanding, spatial UI, grabbing and locomotion. Only scene understanding matters to this game (M4), and raw WebXR plane and mesh detection is small.

**Revisit if** IWSDK ships a tree-shakeable core under about 250 KB gzipped.

## D2 · Screens get their own play limits

M0. On a headset the play volume is the plan's fixed comfort cone (±55° yaw, +25°/−35° pitch). A flat screen shows less than that (about ±37° across on a laptop, less on a portrait phone), so on screens the volume shrinks to what the camera can see, and portrait phones get a taller view. Headset limits are hard-coded constants so headset physics stays bit-identical across JavaScript engines. Screen limits come from trigonometry on the viewport, so screen play isn't guaranteed identical across devices. Before scored Dailies (M3), screen play needs fixed limits too.

## D3 · `npm run dev` serves on the local network

M0. Testing happens on a real Quest over Wi-Fi, and WebXR needs a secure context, so the default dev server uses HTTPS with a self-signed certificate on all network interfaces. `npm run dev:local` stays on http://localhost for desktop and emulator work.

## D4 · Patch super-three's shaders for multiview

M0, found in the first test on a real Quest. super-three 0.185 renders both eyes in one pass by redefining `viewMatrix` as a per-eye array lookup. three r185 added shared shader helpers that take a parameter named `viewMatrix`, and the redefinition breaks them. As a result, every built-in material failed to compile on the headset. The desktop emulator can't catch this because desktop GPUs don't have multiview.

`src/view/multiview-fix.ts` renames that parameter inside the affected functions at startup, which leaves the results unchanged. `multiview-fix.test.ts` scans every shader chunk, so `npm test` fails if a super-three upgrade brings the problem back or changes these helpers. Remove the patch once super-three fixes this upstream.

## D5 · The supplied episode video governs visual fidelity

2026-09-28. The user supplied an episode clip and specified that it is the baseline for every visual comparison.

The [visual baseline](visual-baseline.md) records its SHA-256 and local comparison method. The source clip and decoded frames remain private and are excluded from the public repository. It establishes red-orange discs, violet shaded funnels, and the receding orange circle field as the visible target. This overrides the earlier amber/gold visual direction and other games as aesthetic references. Review every visual change against a lawfully obtained local copy with a cited frame/time range; verify motion against playback, not stills alone.

The current M0 disc, practice hoop, and line grid are prototypes with recorded mismatches, not approved equivalents. No renderer changes or fidelity acceptance are implied by establishing this reference. Existing comfort and photosensitivity constraints remain; any required visual adaptation must be documented as a deviation from the baseline.
