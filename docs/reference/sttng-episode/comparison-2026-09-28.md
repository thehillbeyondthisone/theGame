# First rendered comparison · 2026-09-28

Baseline: `sttng-user-clip-2026-09-28`. The private supplied video and its 00:03.003 frame were compared with the [unmodified 960 × 720 desktop render](implementation-4x3-2026-09-28.png). Both are 4:3; the private source is 480 × 360. The rendered camera and object poses are different, so this is a qualitative effects comparison, not a pixel-match test. Copyrighted source media and the local side-by-side viewer are intentionally excluded from the public repository.

| Dimension | Status | Evidence and remaining difference |
| --- | --- | --- |
| Disc color and silhouette | Partial match | The render now has a solid thin red-orange disc. Its concentric pattern is closer to the source, but exact spiral markings, rim thickness, shading, and animated tilts have not been measured frame by frame. |
| Funnel silhouette | Partial match | A shaded violet flared bowl, tapering curved tail, and mouth angled toward the player replace the wire hoop. The source has more irregular, twisting forms and different proportions across the clip. |
| Funnel interior | Partial match | The render has a darkened concave wall and a visible throat. Its gradient, recess depth, and lip shape remain different from the 01:03.063 close-up. |
| Orange circle field | Partial match | Individual filled circles now recede across the view. Circle spacing, value variation, perspective, and compositing over filmed rooms have not been calibrated against matching camera views. |
| Color | Unverified exact match | Chosen red-orange and violet values were visually tuned from the supplied low-resolution clip, not measured under a calibrated display/color pipeline. |
| Composition | Mismatch | The 00:03.003 source has a room behind the graphics, and the disc/funnel occupy different screen positions. The desktop render uses a dark background; in mixed reality it will composite over the user's passthrough view. |
| Multi-object scenes | Mismatch | Later source frames show multiple funnels and discs at once. Current play has one active funnel and disc, plus a short-lived previous funnel during capture. |
| Capture motion | Partial match, timing unverified | The render now spirals and shrinks the disc into the old funnel. A browser play registered one capture (HUD `hoops 1`) in [the interaction frame](interaction-pass-4x3-2026-09-28.png). This does not establish a time-aligned motion match with 00:58–01:06 of the clip. |
| Device/performance | Unverified on Quest | Desktop typecheck, tests, production build, and size budget passed. No physical headset visual or frame-rate check was run for this pass. |

The present gate is **user visual review**, followed by matched camera/pose comparisons and Quest passthrough testing. Keep this report attached to the baseline; record the next iteration separately instead of rewriting this evidence.
