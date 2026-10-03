# Contributing

THE GAME is an early WebXR prototype. Small, reviewable changes with concrete evidence are more useful than broad rewrites.

## Before opening a pull request

1. Run `npm ci` once, then `quickstart.bat check` (or the equivalent npm commands).
2. Describe the behavior you changed and the input modes it affects.
3. State exactly what you tested: unit suite, desktop browser, IWER emulator, or a physical Quest.
4. Include screenshots or a short capture for visual work, but do not commit copyrighted episode footage.
5. Keep generated output (`dist/`), local configuration, and device/network details out of Git.

Automated checks do not establish a visual match, physical-headset behavior, frame rate, comfort, or fun. Please leave those claims as **unverified** unless you performed the corresponding review and explain the setup.

## Architecture boundaries

- `src/sim` is deterministic and must not import three.js, browser APIs, or device APIs.
- Input adapters emit the shared `Intent` type; game rules do not branch on the active controller.
- `src/input/xr-reader.ts` is the boundary for raw WebXR input.
- Renderer/device work should preserve the desktop fallback and emulator route.
- Photosensitivity limits and the comfort cone are product constraints, not optional polish.

## AI-assisted contributions

AI-generated code is welcome only when the contributor understands and reviews it. In the pull request, briefly say which parts were AI-assisted, what you verified, and what remains uncertain. Do not use generated claims as evidence, and do not submit assets unless you can account for their rights.

## Issues

Good bug reports include the browser and version, device/runtime, URL mode (`quest`, `desktop`, or `emulate`), reproduction steps, expected behavior, actual behavior, and console output. Remove local IP addresses and other private data before posting logs.
