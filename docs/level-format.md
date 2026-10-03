# Appendix A: Level file format

Back to [PLAN.md](../PLAN.md). Status: draft for M1. Once the loader exists, the TypeScript types in `src/sim/level.ts` become the source of truth and this page describes them.

## Goals

- Plain JSON that you can edit by hand, with a version number.
- Deterministic: the same file and seed always give the same level, so replays, Dailies and server-side score checks hold up.
- Room-agnostic: positions are relative to the player, with optional hooks onto real surfaces and a fallback for every hook.
- Comfort is built in: you can't write a placement outside 0.6–2.2 m or ±55° of straight ahead.
- Compact enough to fit in a URL for the stretch-goal level editor.
- Every level is checked by the solver bot before it ships.

## Coordinate frame

- **Play frame.** The origin is the player's head position when the level starts. −Z is *play-forward*, the horizontal direction the player faced at session start. +Y is up. Units are meters and degrees.
- **Placements** use spherical coordinates so they stay comfortable:

  ```jsonc
  { "yaw": -20, "pitch": 5, "dist": 1.6 }   // yaw: + is right; pitch: + is up
  ```

  Limits: `dist` 0.6–2.2, `|yaw|` ≤ 55, `pitch` −35 to +25.
- **Surface hooks (MR, M4).** A placement can ask for a real surface. If the room has none (or wasn't scanned), the fallback placement is used.

  ```jsonc
  "surface": { "on": "wall" | "table" | "floor" | "any", "prefer": "front" | "left" | "right", "fallback": "float" }
  ```

## Level file

```jsonc
{
  "format": 1,
  "id": "c1-03",                 // campaign act 1, level 3. Endless levels: "e-<seed>-<n>"; Daily: "d-<day>-<n>"
  "name": "Drift",               // optional flavor text, never shown as instructions
  "seed": 918273,                // drives all randomness in the level (motes, jitter, generated variation)

  "tempo": { "bpm": 96, "beatsPerBar": 4, "key": "D", "mode": "lydian" },
  "reality": { "blend": 1.0, "overgrowth": 0.1 },   // blend: 1 = full passthrough, 0 = full VR

  "goal": { "type": "sink", "count": 3 },
  // other goals:
  //   { "type": "sinkAll" }                              every disc in the level
  //   { "type": "sequence", "order": ["f1", "f2", "f3"] }
  //   { "type": "survive", "seconds": 30 }               boss towers / hungry funnels
  "par": { "seconds": 30 },

  "discs": [
    { "id": "d1", "at": { "yaw": 0, "pitch": -10, "dist": 0.9 }, "color": "amber", "spawnAfter": 0 }
  ],

  "funnels": [
    {
      "id": "f1",
      "at": { "yaw": -20, "pitch": 0, "dist": 1.6 },
      "surface": { "on": "wall", "fallback": "float" },
      "facing": "player",          // or "up", or a { "yaw", "pitch" } direction for the mouth
      "mouth": 0.16,               // mouth radius (m)
      "throat": 0.05,              // throat radius (m), at least disc radius + 0.01
      "depth": 0.30,               // mouth-to-throat length (m)
      "magnet": 1.0,               // multiplier on the capture magnet (assist setting scales it again)
      "key": null,                 // color key: only discs of this color sink here
      "order": null,               // position in a sequence goal
      "behaviors": [
        { "type": "beatGate", "openBeats": 2, "closedBeats": 2, "phase": 0 },
        { "type": "shy", "coneDeg": 12, "turnAwayDeg": 60 },
        { "type": "hungry", "speed": 0.25 },
        { "type": "temptation", "scoreMultiplier": 3, "craving": 0.25 },
        { "type": "orbit", "radius": 0.2, "periodBeats": 8 }
      ]
    }
  ],

  "fields": [
    { "type": "gravityWell", "at": { "yaw": 0, "pitch": 0, "dist": 1.3 }, "radius": 0.4, "strength": 1.2 },
    { "type": "current", "from": { "yaw": -30, "pitch": 0, "dist": 1.2 }, "to": { "yaw": 30, "pitch": 0, "dist": 1.2 }, "width": 0.2, "speed": 0.6 },
    { "type": "portal", "a": { "yaw": -40, "pitch": 0, "dist": 1.0 }, "b": { "yaw": 40, "pitch": 10, "dist": 1.8 }, "radius": 0.12 },
    { "type": "bumper", "at": { "yaw": 10, "pitch": -5, "dist": 1.4 }, "radius": 0.1, "restitution": 1.1 },
    { "type": "splitter", "at": { "yaw": 0, "pitch": 5, "dist": 1.1 }, "radius": 0.08, "into": 3 }
  ],

  "room": { "wallBumpers": true, "tableBumpers": true },   // MR only; ignored without a room scan

  "hints": [ { "afterSeconds": 20, "text": "…" } ],         // only after the player struggles
  "script": [ { "at": "start", "say": "…" } ]               // campaign story beats; always subtitled
}
```

## Validation rules

The loader rejects a level, and the editor refuses to save it, if any of these fail:

1. `format` is known and every `id` is unique.
2. Every placement is inside the comfort limits above, including the whole path of `orbit` and `hungry` funnels.
3. `mouth` ≥ 2.5 × disc radius, and `throat` ≥ disc radius + 0.01.
4. The goal can be met: enough discs for the funnels, every color key has a matching disc, and sequence orders are contiguous.
5. The solver bot sinks the goal in at most 3 × par, using mind mode only at the default assist. Hands-free play is an accessibility promise.
6. Brightness: the level's scripted light events stay within the photosensitivity guard (see [tuning](tuning.md#photosensitivity-guard)).

## Generated levels

The Endless and Daily generators output this same format. Daily day *n* uses `seed = hash("daily", n)` and produces 7 levels, so every player gets identical files.

## In a URL (level editor, stretch goal)

`https://<host>/#level=` + base64url(deflate-raw(minified JSON)), using the browser's built-in `CompressionStream`. The target is under 2 KB for a typical level. The fragment never reaches the server, so no level data is logged.
