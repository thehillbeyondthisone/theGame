# THE GAME

An AI-assisted WebXR fan prototype that turns the fictional headset game from *Star Trek: The Next Generation* into a small, playable mixed-reality experiment for Meta Quest 3.

Guide a red disc into a shifting violet funnel. On Quest, you can play hands-free by aiming with your head and leaning to adjust depth; hand tracking and controllers provide more direct alternatives. A mouse/touch version and Meta's desktop headset emulator make development possible without wearing the headset.

![Current desktop render: a red disc and violet funnel above an orange circle field](docs/reference/sttng-episode/implementation-4x3-2026-09-28.png)

> **Prototype status:** ten rough, repeatable levels are playable. Automated checks pass, but the latest visual pass, physical Quest retest, 90 fps target, comfort, and long-term fun are not yet accepted. This is a development build, not a finished release.

## What is playable

- **Mind mode:** hold your gaze near the funnel mouth to draw the disc forward; lean to adjust depth.
- **Hand tracking:** open-palm pull, pinch-and-release throw, and palm shove.
- **Controllers:** trigger tractor beam, stick depth control, throws, and haptic feedback.
- **Desktop/mobile:** drag the disc; use the wheel or a two-finger pinch for depth.
- **Ten layouts:** funnels become smaller and begin to move. A sink plays a capture spiral before the next level.

All four control methods produce the same small `Intent` data structure. A deterministic simulation owns capture, rebound, and progression, while rendering and device input stay at the edges. That separation has made the project unusually easy to test even though WebXR hardware itself is not fully automatable.

## Quick start on Windows

Install [Node.js](https://nodejs.org/), clone the repository, then double-click `quickstart.bat` or run:

```powershell
git clone https://github.com/thehillbeyondthisone/theGame.git
cd theGame
npm ci
.\quickstart.bat
```

The launcher defaults to **Quest mode**: HTTPS on your local network, starting at port 5173 and moving upward if the port is occupied. Open the printed `Network` URL in Quest Browser on the same Wi-Fi, accept the self-signed development certificate, then choose **Put it on**.

Other launcher modes:

```powershell
.\quickstart.bat desktop   # plain HTTP on localhost
.\quickstart.bat emulate   # desktop Quest 3 emulator
.\quickstart.bat test      # unit tests
.\quickstart.bat check     # typecheck, tests, build, size budgets
```

You can also use the npm scripts directly:

| Command | Purpose |
| --- | --- |
| `npm run dev` | LAN HTTPS development server for a Quest |
| `npm run dev:local` | localhost desktop server |
| `npm test` | simulation, controls, comfort, and renderer-regression tests |
| `npm run build` | TypeScript check and production build |
| `npm run size` | enforce the Quest download budgets after a build |

## Controls

| Mode | Input |
| --- | --- |
| Mind (default in XR) | Look toward the destination. Hold near the funnel mouth to advance; lean in/back for manual depth. |
| Hands | Open palm to pull, pinch to hold, release while moving to throw, or shove with the palm. |
| Controllers | Trigger to pull, stick to change depth, release during a flick to throw. A/X resets; B/Y toggles stats. |
| Desktop/mobile | Drag. Wheel or two-finger pinch changes depth. `R` resets; `H` toggles stats. |

## How AI was used

This was built through human-directed, agent-assisted programming—not by a one-shot game generator, and there is no generative AI in the running game. The human set the concept, feel, reference target, constraints, and acceptance calls. Coding agents helped research browser/XR tradeoffs, propose architecture, implement TypeScript, write tests and documentation, and investigate failures. Every generated change still had to survive source review and the project checks; hardware and visual claims remain explicitly unverified until a person tests them.

The most useful lesson so far: an emulator can validate input and application flow but cannot prove headset rendering. A real Quest exposed a multiview shader-name collision that desktop GPUs never exercised. The workaround is isolated in [`src/view/multiview-fix.ts`](src/view/multiview-fix.ts) and guarded by a regression test.

Read [AI development and verification](docs/AI-DEVELOPMENT.md) for the workflow, failure boundaries, and lessons suitable for discussion on `/r/aigamedev`.

## Project map

| Path | What lives there |
| --- | --- |
| `src/sim` | deterministic world state, comfort limits, capture, rebound, and level progression |
| `src/input` | mind, hands, controller, and pointer adapters that emit shared intents |
| `src/view` | super-three rendering, shapes, HUD, and the Quest multiview patch |
| `src/platform` | WebXR session, haptics, audio, and Meta Web Launch integration |
| `src/dev` | desktop headset-emulator setup, excluded from production behavior |
| `docs` | decisions, tuning, roadmap, visual-review method, and public development notes |

The broader concept and milestone plan are in [PLAN.md](PLAN.md). Engineering decisions are recorded in [docs/decisions.md](docs/decisions.md).

## Verification and honest limits

Run `quickstart.bat check` before submitting a change. It checks TypeScript, the Vitest suites, the production build, and compressed download budgets. Those checks cover deterministic code and build integrity; they do **not** prove visual fidelity, physical Quest behavior, Wi-Fi/firewall reachability, sustained frame rate, comfort, or fun.

The private visual baseline is copyrighted episode footage supplied for local comparison. It and its decoded frames are deliberately excluded from this public repository. The public repo contains only implementation screenshots and a description of the comparison process; see [docs/visual-baseline.md](docs/visual-baseline.md).

## Contributing and license status

Bug reports and focused experiments are welcome; start with [CONTRIBUTING.md](CONTRIBUTING.md). Please distinguish automated evidence from emulator, browser, and physical-headset evidence.

No open-source license has been granted yet. The source is public for inspection and discussion, but public availability alone does not grant permission to copy, modify, or redistribute it. Third-party dependencies retain their own licenses.

This is an unofficial, non-commercial fan experiment. It is not affiliated with or endorsed by Paramount, CBS, Meta, or the creators of *Star Trek*. Names and marks belong to their respective owners; no episode footage or franchise audio is distributed here.
