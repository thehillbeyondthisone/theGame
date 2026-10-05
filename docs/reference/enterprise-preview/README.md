# Enterprise lounge visual preview

Local preview: http://localhost:5174/?preview=enterprise (start with npm run dev:local).

Baseline checked 2026-10-05: clean working tree, local and live GitHub main both e926502760bd165211bf2f2f5e9331cedc0b1b4d. Baseline build, 49 tests across 11 suites, and size checks passed before editing.

This is an opt-in visual review. The normal URL retains the original presentation. Scene controls switch Original/Lounge without creating a new world or resetting the run, adjust background blur from 0 to 12, and disable ambient drift and the added capture accents through Calm visuals. System reduced-motion preferences also disable those effects. The artwork and preview stylesheet load only on this route. A portrait companion plate keeps the furniture and window arches visible on narrow phones.

The background uses three masked copies of the same image, with different blur strengths for distant windows, room, and near furniture. This is an inexpensive depth-of-field approximation for a fixed camera, not a depth-buffer lens simulation or a fully modeled room. The only background motion is a very slow scale/translation of the plate; there is no camera movement or change to aiming.

Foreground refinements include warmer fill lighting, a more polished disc rim and funnel lip, and a translucent circle field that fades towards its edges and distant rows. The shared light limiter gates the added local capture ripple and spiral motes. Those accents stay disabled in XR. XR look transitions restore the original foreground materials, lighting, circle-field opacity and dark/transparent background. The DOM backdrop and toolbar hide in both AR and VR.

The deterministic simulation, touch assistance, scores, save keys, camera limits, and original capture timing are retained. The episode's red-orange disc/violet funnel/circle-field direction remains the foreground reference. These new generated lounge backgrounds are artistic reconstructions for this preview, not approved exact reproductions of the episode set. No episode media was added.

## Artwork provenance

Generated with the built-in imagegen tool on 2026-10-05. Original PNGs are preserved here as lounge-source.png and lounge-portrait-source.png. Runtime WebP conversions (quality 87) are in public/previews/enterprise/lounge.webp and lounge-portrait.webp. Compression changes the file format, not the composition.

Landscape prompt:

Use case: stylized-concept.
Asset type: cinematic environment background plate for a desktop/mobile browser game, wide landscape 16:9.
Primary request: A beautiful photorealistic recreation of the Enterprise-D Ten Forward lounge from Star Trek The Next Generation, EMPTY, viewed from a seated person's eye level looking towards its distinctive broad curved panoramic windows and the stars outside.
Scene: the warm comfortable late-1980s futuristic lounge interior, accurate understated TNG production-design character, generous curved beige and taupe structural window arches, dark reflective windows into deep blue-black space, muted burgundy upholstered lounge seating along the lower left and right edges, low small round tables, warm peach and amber practical wall lights, tasteful integrated softly lit panels, curving ceiling details. Soft faint blue nebula through the center windows, a few tiny stars. Layered room depth and physically convincing materials, photographed as a high-end real film set rather than a cartoon or an illustration.
Composition: panoramic wide view, coherent room architecture, central upper-middle half mostly dark blue windows/space with calm negative space for a violet game funnel and red disc that will be composited later. The foreground lower middle floor is clear and unobstructed. Side furniture frames the composition. The center must still crop beautifully to a narrow portrait phone view, retaining recognizable structural window arches. Camera level, stable, no fisheye, no dramatic tilt.
Lighting: intimate cinematic warmth from amber practicals at the sides, cool blue starlight behind, balanced midtones so the room is visible, subtle naturally photographic bokeh at the very distant stars and light fixtures, restrained bloom.
Focus: retain detailed architecture and furnishings, additional adjustable optical blur will be applied in the game.
Constraints: environment ONLY, no people, no characters, no faces, no text, no logos, no watermark, no HUD, no game objects, no disc, no funnel, no orange circles, no giant planet filling the windows. Do not make a spaceship bridge, cockpit, command deck, industrial corridor or modern nightclub.

Portrait prompt (the landscape PNG was the sole supporting reference):

Use case: stylized-concept. Asset type: PORTRAIT 9:16 cinematic environment background plate for a mobile phone game.
Use the attached landscape Enterprise-D Ten Forward lounge artwork as the visual reference. Reframe and recompose this SAME room as a beautiful vertical photograph, with consistent taupe curved window arches, burgundy lounge armchairs, brass/glass tables and warm amber fixtures, the same deep blue starfield and faint nebula beyond the windows. Keep the same photoreal film-set finish, warm/cool balance and quiet mood.
This is a portrait companion view of the same lounge, not a narrow center crop. Pull the seated eye-level camera back so a whole tall curved window arch remains visible in the upper half, and clearly recognizable burgundy lounge chairs, a warm lamp, side tables and a little greenery frame the lower left and right EDGES of the portrait. Leave clear dark space in the central upper-middle area for a violet funnel/red disc to be overlaid later. The lower center floor is clear. Include enough room architecture at both sides so it still feels like a lounge when cropped to a 390x844 phone. Camera stable, no fisheye, no dramatic tilt. Retain detailed architecture; adjustable blur is applied later by the game.
Environment only: no game objects, no HUD, no disc, no funnel, no orange circles, no people, no characters, no text, no logos, no watermark.

## Verification

- `npm run build`: TypeScript and production build passed.
- `npm test`: 49 tests in 11 suites passed, covering simulation, score runs, pointer/touch/mind/hand inputs, comfort, light limiting and the multiview regression.
- `npm run size`: 152.0 KB gzipped JavaScript and 380.5 KB total including both artwork plates, within the 400 KB / 2 MB budgets. A given orientation uses one plate.
- `git diff --check`: passed.
- Browser visual review: 1280 x 720 desktop, 390 x 844 portrait, 844 x 390 landscape. Scene controls checked at blur 0, 6 and 12; Original/Lounge, Calm visuals, and normal-route isolation checked. Screenshots: desktop-landing.jpg, desktop-play.jpg, portrait-play.jpg, landscape-play.jpg.
- IWER emulated immersive entry/exit: toolbar and backdrop hid on entry, original foreground remained visible, and lounge presentation returned on exit. No shader errors were logged. The emulator logged its existing duplicate-Three.js warning.
- Built preview served at http://localhost:4173/theGame/?preview=enterprise: lazy preview CSS/script and the /theGame/previews/enterprise/lounge.webp asset loaded, gameplay rendered, and no browser errors were logged.

Browser sizing and IWER checks do not establish physical phone/Quest performance, touch feel, comfort, or visual acceptance. The generated set artwork is a proposed interpretation; user visual review is still the acceptance step.
