# Appendix B: Starting tuning values

Back to [PLAN.md](../PLAN.md). These are first guesses to tune against real play, not answers. The values the code already uses live in `src/sim/tuning.ts`, which is the source of truth; this page keeps the whole list, including systems not built yet.

Units: meters, seconds, degrees (radians in code).

## Current screen gameplay pass (2026-10-04)

These implemented values supersede the proposed scoring values below. Other roadmap mechanics remain provisional.

| Value | Current behavior |
| --- | --- |
| Score run | 60 active seconds; starts on first canvas gesture; pauses when the page is hidden |
| Sink / Perfect | 100 / 200 points; Perfect requires a plane crossing within 35% of mouth radius and no rim contact on that attempt |
| Streak multiplier | ×2 at 3 clean sinks, ×3 at 6, ×4 at 9; rim/reset breaks streak without removing points |
| Touch aim | Marker up to 52 CSS px above the finger; small attraction within 38 CSS px (bounded by screen width) |
| Touch entry | Approach 0.18 m above the mouth, then pull 0.12 m through once within 0.065 m of the approach target; retains radial aiming error |
| Personal best | Completed score runs only; stored locally under `the-game-sprint-best-v1`; free play has no deadline |
| Fixed-step catch-up | Up to 12 steps, covering the 0.1 s frame-time cap; allows 30 fps rendering to keep the timer and simulation at full speed |

Emulated touch verifies capture, scoring, replay, cancellation, simultaneous steering/depth input, and portrait/landscape UI. Unit checks cover centered entries at 30/60/90 fps; these are frame-timing simulations, not device performance measurements. Physical phone and Quest feel/audio/comfort remain playtest work.

## World and comfort

| Value | Start | Notes |
| --- | --- | --- |
| Play distance from head | 0.6–2.2 m | Hard limit for every object and target |
| Yaw from play-forward | ±55° | |
| Pitch | −35° to +25° | Looking down is easier than looking up |
| Simulation step | 1/120 s, fixed | Rendering interpolates between steps |
| Max frame catch-up | 12 steps | Covers the 0.1 s frame-time cap; drop excess backlog after longer hitches |

## Disc

| Value | Start | Notes |
| --- | --- | --- |
| Radius | 0.04 m | Collides as a sphere of this radius |
| Free-flight drag | 0.6 /s | Speed halves in about 1.2 s |
| Max speed | 6 m/s | |
| Boundary spring | 25 /s² | Soft push back inside the comfort volume |
| Idle spin (visual) | 1.5 rev/s | |

## Mind mode (head steering)

| Value | Start | Notes |
| --- | --- | --- |
| Head-direction filter | One Euro: min cutoff 1.2 Hz, beta 0.6, derivative cutoff 1.0 Hz | Min cutoff drops toward 0.35 Hz at full Focus |
| Starting depth | 1.2 m | |
| Lean dead zone | 2 cm | Forward component only |
| Lean gain | 12 (m/s of depth change per m of lean) | Rate control, not position control |
| Lean neutral drift | τ = 3 s | Posture changes don't count as lean for long |
| Funnel gaze depth | 3° full / 8° fade, 1.4 m/s, target 0.24 m past mouth | A steady look draws the disc forward; lateral aim remains on the gaze ray |
| Miss recovery | Pull 0.30 m in front of mouth after the disc is 0.08 m behind; resume at 0.10 m in front | Lets gaze alone retry a missed moving funnel |
| Spring stiffness | 20 → 70 /s² | From Focus 0 to Focus 1 |
| Damping ratio | 0.85 | Slightly floaty; 1.0 = no overshoot |
| Focus builds when | head turns slower than 20°/s | Full in 1.2 s |
| Focus drains when | head turns faster than 45°/s | 2× the build rate |
| Takeover after a throw | 1.0 s grace, then 0.5 s ramp | So head steering doesn't swallow a throw |

## Telekinesis (hand tracking)

| Value | Start | Notes |
| --- | --- | --- |
| Pinch | on < 1.8 cm, off > 3.5 cm | Thumb tip to index tip |
| Open palm | finger straightness ≥ 0.85 (off below 0.80) | Base-to-tip distance ÷ total bone length, averaged over 4 fingers. Meta's captured poses read 0.99 open, about 0.3 curled |
| Palm must face the play area | dot ≥ 0.35 | Palm normal · aim direction; hands resting in the lap stay idle |
| Shoulder estimate | head − 0.13 m down, ± 0.17 m sideways | Aim ray goes from the shoulder through the palm |
| Reach → depth | 0.25–0.60 m reach → 0.6–2.2 m | Extend your arm to send the disc further |
| Open-palm spring | 35 /s², ratio 0.9 | |
| Pinch-hold spring | 140 /s², ratio 1.0 | |
| Throw | 1.6 × release velocity, max 5 m/s | |
| Aim assist | 15° cone, bends up to 50% | Toward the best funnel in the cone (M1) |
| Palm push | palm speed ≥ 1.1 m/s along its normal | Impulse 1.8 × palm speed, 0.4 s cooldown |

## Controllers

| Value | Start | Notes |
| --- | --- | --- |
| Trigger dead zone | 0.08 | |
| Beam spring | 30 → 90 /s² with trigger pressure, ratio 0.9 | Depth starts at the disc's distance when you pull |
| Stick depth speed | 1.6 m/s at full tilt, dead zone 0.15 | |
| Throw on release | 1.4 × disc velocity | A flick is just a fast release |
| Haptics: beam strain | 0.05–0.35 intensity, 15 ms pulses at 20 Hz | |
| Haptics: throw | 0.6 for 40 ms | |
| Haptics: sink heartbeat | 0.8 for 50 ms, then 0.5 for 70 ms, 180 ms apart | |

## Phone and desktop

| Value | Start | Notes |
| --- | --- | --- |
| Play volume | what the camera shows, less a 6° margin | Never wider than the headset limits; see [D2](decisions.md) |
| View | 60° vertical; portrait phones widen it so the horizontal view stays ≥ 50° | |
| Drag spring | 60 /s², ratio 0.9 | |
| Wheel depth step | 0.1 m per notch | |
| Touch aim | Center lock within min(28 px, 6.5% of screen width); feather over twice that radius | Accepts either the finger or the marker up to 52 px above it; manual depth overrides assistance |
| Throw on release | 1.3 × disc velocity | |

## Capture (M1)

The rough ten-level loop currently uses mouth radii 0.15 → 0.12 m and sideways sway up to 0.12 m. Rim contacts rebound, and the disc waits 0.82 s while its capture animation finishes. The detailed values below remain targets for later full capture physics.

| Value | Start | Notes |
| --- | --- | --- |
| Mouth radius | 0.16 m early → 0.09 m late | |
| Throat radius / depth | 0.05 m / 0.30 m | Trumpet profile, exponent 2 |
| Magnet range | 2.5 × mouth radius | In front of the mouth only |
| Magnet strength | 2.5 m/s² × (1 − d/range)² × multiplier | Assist presets 0.5 / 1 / 1.6 / 2.5 |
| Rim tube radius | 0.008 m | |
| Rim restitution / friction | 0.55 / 0.2 | Clank sound above 0.25 m/s normal speed |
| Swish | no rim contact in the 0.3 s before crossing the mouth | |
| Skip-out (later levels) | entry speed > 2.4 m/s along the axis | |
| Minimum swirl | 0.6 m/s tangential at the mouth | So head-on entries still spiral |
| Descent | 0.15 → 0.6 m/s, rolling friction 0.15 | Aim for 0.8–2.0 s spirals |
| Whirl bonus | 3 or more loops | Visual spin capped at 12 rev/s |

## Pulse and rewards (M2)

| Value | Start | Notes |
| --- | --- | --- |
| Thump | 45 Hz sine, 120 ms decay | Ducks the music 3 dB |
| Light sphere | expands at 3 m/s, +25% brightness peak | Calm visuals: +10% |
| Euphoria | one music layer per consecutive sink, 6 layers | Combo breaks after 8 s without a sink, or a miss |
| Crescendo chance | 4% + 2% per combo step + 6% on a Swish | Cap 25%; skill raises the odds, time played never does |
| Rapture | at combo 8 | 6 s at 0.5× time, mouths × 1.35 |

### Photosensitivity guard

Enforced by one shared limiter that every light effect goes through, not left to each effect:

- at most 2 brightness pulses in any rolling 1 s
- each pulse eases in over at least 100 ms
- saturated red never covers more than 25% of the view
- calm visuals: half the amplitude and at most 1 pulse per second

## Craving (M3)

| Value | Start | Notes |
| --- | --- | --- |
| Rise | 1.0 %/s, +0.1 %/s per level, cap 3 %/s | |
| Relief | sink −18%, Swish −25%, Whirl −30% | |
| Effects | color drains from 50%, static from 70% | Run ends at 100% ("withdrawal") |

## Scoring (M1–M3)

| Value | Start |
| --- | --- |
| Sink | 100 |
| Swish | +50 |
| Whirl | +25 per loop beyond 2 |
| Bank shot (off a bumper or wall) | +75 |
| Combo multiplier | × (1 + 0.25 × combo) |
| Under par | +10 per second saved |

## Adaptive difficulty (New Game+)

Every level, compare sinks and misses over the last 5 levels with a target of 70% clean entries, then move the magnet multiplier 15% toward that target, within 0.6–1.6×.

## Performance budgets (Quest 3, 90 Hz)

| Value | Budget |
| --- | --- |
| Frame | 11.1 ms (aim for game logic + render submit ≤ 6 ms of CPU) |
| Draw calls | ≤ 100 |
| Triangles | ≤ 150k |
| First playable download | ≤ 2 MB transferred |
| JavaScript | ≤ 400 KB gzipped |
