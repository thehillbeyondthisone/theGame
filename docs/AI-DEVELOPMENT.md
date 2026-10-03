# AI development and verification

This project is a human-directed game prototype built with coding agents. It does not call an AI service at runtime, and its visuals, physics, and controls are ordinary deterministic code.

## What the collaboration looked like

The human supplied the concept, visual target, gameplay corrections, device observations, risk tolerance, and final acceptance decisions. Agents were used as implementation partners: reading the repository, researching WebXR tradeoffs, proposing bounded plans, writing and revising TypeScript, adding tests, running builds, and documenting evidence.

That distinction matters. The productive loop was not “prompt once and ship.” It was:

1. Set one observable goal, such as making the disc controllable without picking up a controller.
2. Keep game rules behind a narrow interface (`Intent`) so several input experiments can share the same simulation.
3. Add a deterministic test for the rule before trusting the renderer.
4. inspect the running browser or emulator and compare it with the requested behavior.
5. Treat the physical headset as a separate evidence tier.
6. Record what is still unverified instead of letting a successful build stand in for user acceptance.

## Where the agents helped most

**Architecture.** Separating input, deterministic simulation, rendering, and platform services made agent changes easier to constrain and review. It also kept mouse, hand, controller, and gaze experiments from turning into four versions of the game rules.

**Fast test scaffolding.** The suite covers simulation, control arbitration, hand-pose interpretation, head-steered “mind” input, photosensitivity limits, and the Quest renderer patch. These tests catch regressions quickly, while remaining honest about what they cannot observe.

**Failure investigation.** A physical Quest produced shader compilation failures that did not occur in Meta's desktop emulator. The cause was a name collision: super-three's multiview macro rewrote `viewMatrix`, while newer shared shader helpers also used `viewMatrix` as a parameter name. The small startup patch renames those helper parameters, and a test scans the shader chunks so a dependency update cannot silently reintroduce the fault.

**Documentation as state.** Plans, decisions, tuning values, comparison notes, and unverified gates live beside the code. This reduces the chance that a later agent treats a plausible claim as an established result.

## What still requires a person

- deciding whether gaze steering is satisfying rather than merely functional;
- judging the visual result against the private reference at comparable poses and timings;
- testing Wi-Fi, certificate, hand tracking, haptics, and multiview on a physical Quest;
- measuring sustained headset frame rate;
- reviewing comfort and photosensitivity in use;
- making the legal and creative decisions around a fan work.

The current automated pipeline verifies TypeScript, unit tests, a production build, and compressed download budgets. Desktop emulation adds input/scene evidence. Neither is reported as physical-device proof.

## Practices that improved the AI-assisted work

- Give the agent one acceptance target at a time and keep the source/reference visible.
- Ask for evidence-specific language: “the tests passed” and “Quest verified” are different statements.
- Preserve deterministic logic outside the renderer so tests can run quickly.
- Use device reports as data. The emulator is a convenience, not an oracle.
- Keep copyrighted references private; publish the method and original implementation evidence instead.
- Review dependency and generated-asset rights before public release.

## Reproduce the automated evidence

On Windows:

```powershell
npm ci
.\quickstart.bat check
```

Or on any supported Node.js environment:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run size
```

The exact passing test count may grow. The command names and the evidence boundary are more important than a frozen number.
