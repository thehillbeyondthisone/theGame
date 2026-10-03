# Private episode visual baseline

The governing local visual target is a user-supplied clip from the episode, baseline ID `sttng-user-clip-2026-09-28`. It supersedes the earlier amber/gold art direction and other games as visual references.

The clip and decoded episode frames are intentionally excluded from the public repository. Contributors must use a lawfully obtained reference and must not attach or commit copyrighted footage. The expected local path is:

```text
docs/reference/sttng-episode/videoplayback.mp4
```

The approved file has SHA-256 `58fabb5eb15b0574d22992aea69815ebe04b4ffa102e2cf9a82913666e26f866`, resolution 480 × 360, aspect ratio 4:3, and frame rate 30000/1001 fps. These identifiers make local comparisons reproducible without redistributing the source.

## Visible target

These are observations from the private baseline, not recovered mesh topology or physical measurements.

| Element | Visible target |
| --- | --- |
| Disc | Thin, filled red-orange disc; brighter rim; darker face with a lighter concentric/spiral motif. Face-on and narrow tilted silhouettes both matter. |
| Funnel | Filled indigo/violet/lavender surface. Broad flared mouth around a dark recessed throat, narrowing into a bending or twisting tail. |
| Shading | Smooth gradients with deep blue-purple shadow and lavender highlights. The compact, solid early-CG appearance matters more than modern glow. |
| Ground pattern | Repeating orange/red filled circles on a receding perspective plane, with dark gaps and occasional local value changes. |
| Composition | Discs hover above the patterned field. Funnels appear at several depths; large foreground objects coexist with smaller distant ones. |
| Motion | Funnels bend, turn, and change mouth shape. Discs tilt, overlap the mouths, and shrink into the throats. Later shots contain several active objects. |
| Capture | The private range 00:58–01:06 contains approach, mouth movement, descent into the throat, brighter surface treatment, and a return to multiple objects. |

Exact world scale, camera calibration, hidden geometry, material values, and animation curves are not established by the low-resolution footage. Implementation parameters should be fitted to reproduce visible results rather than described as measurements.

## Current implementation status

The first pass replaced the gold disc, wire hoop, and line grid with a red-orange patterned disc, shaded violet funnel, and field of filled circles.

![Public implementation screenshot](reference/sttng-episode/implementation-4x3-2026-09-28.png)

The [first comparison record](reference/sttng-episode/comparison-2026-09-28.md) lists the remaining differences. The implementation is playable, but exact visual fidelity and timed animation matching remain open. A browser capture is evidence of interaction, not a visual acceptance result.

## Comparison procedure

1. Identify the feature and the private reference frame or time range before changing visuals.
2. Capture the implementation at a comparable camera angle, aspect ratio, object pose, apparent scale, and animation phase. Preserve an unmodified screenshot or clip.
3. Compare silhouette/proportions, disc markings, hue/value, throat depth, field spacing, placement, and compositing.
4. For motion, compare at normal speed and matched timestamps. A still-frame match cannot pass motion.
5. Mark each dimension **match**, **mismatch**, or **unverified**, with specific evidence and remaining differences.
6. Keep visual fidelity, automated checks, headset behavior, performance, and human approval as separate gates.

The comfort and photosensitivity constraints still apply. If an effect must change for safety, record it as a deliberate deviation rather than silently redefining the baseline.

## Rebuild private viewing aids

With Python, Pillow, FFmpeg, and ffprobe installed, run:

```text
python scripts/extract-episode-reference.py docs/reference/sttng-episode/videoplayback.mp4
```

The script verifies the hash before it writes the local frame anchors, contact sheets, and manifest. Those derivatives remain ignored by Git. The source video is never modified.
