# `/r/aigamedev` post draft

Suggested flair: **Workflow** (this is a free development prototype, not a commercial game or AI service).

Before posting, add a short gameplay clip or animated GIF if one is available, re-check the subreddit rules, and answer comments in your own voice. The post is intentionally about the development workflow and its limitations rather than a drive-by repository link.

## Title

I used coding agents to build a hands-free Quest WebXR prototype—and the real headset found what the emulator could not

## Body

I have been turning the fictional headset game from *Star Trek: The Next Generation* into a small mixed-reality prototype for Quest 3. The current loop is simple: steer a red disc into a violet funnel, watch it spiral down, then continue through ten rough spatial layouts. It supports head-directed “mind” control, hand tracking, controllers, and mouse/touch.

The interesting part for this subreddit is how the AI-assisted development held up once the project left the prompt window.

This was not a one-shot generated game, and there is no generative AI running inside it. I used coding agents as pair programmers while I owned the concept, reference target, feel corrections, device tests, and acceptance decisions. The agents helped compare SDK options, separate deterministic simulation from WebXR input and three.js rendering, implement control experiments, add regression tests, and keep a decision log. I rejected the heavyweight SDK path after measuring a 1.67 MB gzipped empty build versus roughly 142 KB for the early plain-super-three build.

The best lesson came from a failure. Everything worked in the desktop Quest emulator, but the first physical-headset test made every built-in material fail to compile. The emulator does not exercise the GPU multiview path. On the headset, super-three rewrote `viewMatrix` as a per-eye macro, while newer shared shader helpers used the same name for a function parameter. A small isolated rename fixes it, and a regression test now scans every shader chunk so an upgrade will fail loudly if the workaround becomes invalid.

I also learned to separate evidence levels in the agent workflow. TypeScript, unit tests, a production build, and bundle budgets can all pass without proving the visuals, Wi-Fi path, hand tracking, comfort, 90 fps, or whether the game is actually fun. The repo labels those items as unverified instead of rolling them into “it works.”

The source and fuller workflow notes are here:

https://github.com/thehillbeyondthisone/theGame

Current render:

https://github.com/thehillbeyondthisone/theGame/blob/main/docs/reference/sttng-episode/implementation-4x3-2026-09-28.png

The episode footage used as a private local comparison reference is deliberately not in the repository. The public project contains the implementation screenshot and the comparison method, not redistributed show footage.

I would especially like to compare notes with anyone using agents on hardware-bound games: how do you keep them from overclaiming success when the last mile depends on a headset, controller, unusual GPU path, or human feel test? And if you have worked on gaze/head-directed controls without eye tracking, what made depth steering feel intentional rather than mushy?

## Posting notes (do not include in the Reddit body)

- This is a text post about workflow, with a repository link as supporting material.
- Do not describe it as an exact visual recreation; that acceptance is still open.
- Do not claim the latest build is Quest-verified or 90 fps; the physical retest is pending.
- If the project later becomes commercial, use the subreddit's required commercial self-promotion flair and re-check its current promotion rule.
- No Reddit post has been submitted automatically; this file is only a local draft.
