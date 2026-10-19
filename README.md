# Meoz · The Workroom

[**Explore the live scene →**](https://meoz.ai/workroom) ·
[**Download standalone HTML →**](https://github.com/Meoz-Focus/meoz-workroom/releases/latest)

A procedural 3D study of hands working at a 16-inch MacBook Pro, with a blue
Meoz-inspired cat beside them. This folder contains the editable source for
`https://meoz.ai/workroom`. This is its complete standalone source repository.

Repository: https://github.com/Meoz-Focus/meoz-workroom (currently private).
Licensed under Apache-2.0. Distributed remixes must preserve the repository
attribution in [NOTICE](NOTICE); see [ATTRIBUTION.md](ATTRIBUTION.md) for details.

The loading screen introduces **Meoz Workroom**, with “A little company. A little
more focus.” and a short description of Meoz as a focus companion for Mac.
Loading messages keep the same welcoming tone as the scene.

## Run

```sh
git clone https://github.com/Meoz-Focus/meoz-workroom.git
cd meoz-workroom
npm ci
npm start
```

## Just run the HTML

Download `workroom.min.html` from the latest release. It contains the renderer,
shaders, interface, and assets in one file. No npm install or build is needed.
Release downloads require repository access while this repository is private.

Open the file in a browser with WebGPU. If your browser does not allow WebGPU
on `file://`, serve the download directory locally instead:

```sh
python3 -m http.server 8081 --bind 127.0.0.1
```

Then open `http://localhost:8081/workroom.min.html`. Rendering runs locally;
there are no CDN dependencies, API keys, or runtime asset downloads. External
Meoz/source links only navigate when clicked. WebGPU and hardware acceleration
are required; there is no WebGL fallback.

## Make it yours

1. Run the source checkout using the commands above.
2. Edit `js/screen.js` for laptop-screen content, `js/cat.js` for the companion,
   `js/scene.js` for the room, or `index.html` for the interface and copy.
3. Run `npm test` and `npm run build`. Share `workroom.min.html` for a compact
   single-file experience, or `workroom.html` for the readable bundle.

Please consider keeping the small **Made with Meoz Workroom** demo link, or
adding this credit to your README:

```markdown
Based on [Meoz Workroom](https://github.com/Meoz-Focus/meoz-workroom)
by Meoz-Focus, licensed under Apache-2.0.
```

The visible link is optional and may be removed or restyled. The license and
applicable NOTICE attribution must still be retained when distributing the work.
The build embeds those notices in both standalone HTML outputs.

## Rendering and browser requirements

Open **http://localhost:8081/** in a current browser with WebGPU and hardware
acceleration. The first load sculpts the scene and builds its acceleration
structure; allow several seconds. A clear image progressively develops as light
samples accumulate. It stops tracing at 1024 samples to avoid idle GPU work.
Tracing defaults to Auto, accounting for Retina pixel density while keeping
the aspect ratio and a two-million-pixel tracing budget. Comfort is available
for slower hardware. Presentation uses display density separately, capped at
4096×3000, so the laptop's self-lit UI remains sharp at lower trace resolutions.
The filtered preview becomes usable before tracing finishes.

## Exact reference stack

Matches [Noniv/web-ocean](https://github.com/Noniv/web-ocean): vanilla JavaScript
ES modules, raw WebGPU, hand-written WGSL, HTML/CSS, a tiny Node server, and
esbuild ^0.25.0 as the only development dependency. No rendering engine,
framework, external models, runtime downloads, or external textures.

See [REFERENCE-STUDY.md](REFERENCE-STUDY.md) for the pinned source and study.
The original reference clone is excluded from this repository; the study records
its exact commit and upstream URL.

The laptop-screen avatar uses the blue companion
drawing in `js/companion-icon.js`. Its head, ear and eye proportions come from
the same `CAT_FACE` layout as the 3D model. This is the workroom's blue variant;
production Meoz brand assets remain untouched. The header, loading screen and favicon
use the default pink/lavender Meoz app icon in `meoz-app-icon.svg`, copied from
the canonical production website SVG. Its 16/32/48px PNGs, multi-size ICO and
180px touch icon use the same pink artwork. Both standalone pages embed their
referenced SVG/PNG assets.

The top-left Meoz logo links to `https://meoz.ai/` in the current tab and supports
keyboard navigation with a visible focus outline.

`npm start` and `npm run build` regenerate the blue companion SVG and verify
that the pink app icon's raster fallbacks match its source hash. After changing
the app icon design, regenerate
those fallbacks with `node generate-icon.mjs --sharp /absolute/path/to/sharp`.
Sharp is only an optional asset-generation tool, not an app dependency.

## Explore

- Drag for a small orbit around the current composition; scroll or pinch to
  zoom within its frame. The scene stays anchored, with no free panning.
- **Workspace / Companion / The details** switch camera compositions (keys 1–3).
  Each has its own orbit/zoom limits and stays on the front side of the desk.
  Rear/side presets are removed; old `?view=rear` and `?view=side` links return
  to Workspace. The old rear-view shortcut 4 is inactive.
- **Reset view** (or **R**) restores the default Workspace angle, zoom and pan.
  Workspace looks squarely at the laptop so its left and right edges sit at
  the same height. Orbiting keeps the camera upright. Wheel, pinch and drag
  share the same limits, which also survive resizing and hiding controls.
- Workspace uses a closer seated viewpoint with less foreground arm in view.
  Taller windows pull back enough to retain the mug and cat; Reset view uses
  the same responsive framing. The linen cuffs sit just behind the wrists.
  Every view stops at its default framing when scrolling or pinching outward, and
  tall portrait clean views use a slightly higher angle to hide sleeve ends.
  On portrait phones the scene occupies a shorter area below the headline,
  capped at 1.34 times the screen width. Hide interface centres that same
  compact frame rather than pulling the camera back to fill a tall screen.
- The lid is fixed at **102°** from the keyboard, with its hinge transform
  constrained to the requested **95–110°** range.
- Settings change afternoon warmth, exposure, aperture, and render resolution.
- Depth of field starts Off to keep the default product scene and display sharp.
  Enabling it restores the thin-lens treatment, including on the laptop screen.
- **Gentle typing & breathing** enables live procedural deformation. Turn it off
  for a sharp, converged still. Live mode retains a short temporal exposure and
  trades image stability for motion. Frame rate depends on GPU and resolution.
- Camera button downloads the rendered scene as a PNG using GPU readback.
- **H** hides controls; **H** again or Show controls restores them.
- Query options: `?view=cat`, `?view=cup`, `?view=detail`, `?scale=0.65`, `?w=1440&h=900`, `?ui=0`.

## How it is made

CPU-generated rounded enclosures, lathed ceramics, individually labelled keys,
speaker perforations, blended implicit hand anatomy, separate fingernails,
knuckle creases, knitted sleeves, sculpted cat ears, fur ribbons, and tapered
whiskers feed a threaded triangle BVH. The GPU traces three-bounce paths with
GGX/diffuse importance sampling, multiple importance sampling for three broad
area lights, procedural material microstructure, and a thin-lens camera.

Nails are thin, softly squared patches fitted directly to the rendered fingertip
triangles. Their cuticles enter the skin and their short free edges have a
subtle warm ivory tint, rather than raised oval shells.

The left wrist wears a 40 mm silver watch with an articulated three-piece
steel bracelet, polished bezel, dark dial, applied indices and analog hands.
The bracelet fits the same implicit forearm surface as the skin; the caseback
is seated against its contact points and stays clear of the linen cuff.

The ceramic mug has a rolled lip, continuous inner wall, and an exterior
C-shaped handle. Rounded handle ends join the outer wall and stop before the
cavity, keeping the coffee surface clear from every viewing angle.

Rotated low-discrepancy subpixel samples smooth silhouette edges. Linear 32-bit
HDR accumulation and luminance moments feed four variance/depth/normal/albedo-aware
à-trous filters, film tone mapping, and sRGB encoding. Stable geometric guides
keep the filter independent of random ray jitter and surface microtexture.
Display and key legends have trilinearly sampled texture mipmaps to reduce shimmer
at grazing angles. A display resolve uses the actual lid plane, first-hit material
and depth guides to sample the emissive UI at presentation density, after room
denoising. The bezel, rear lid and foreground objects still occlude the screen.
It uses the same exposure and tone mapping; room illumination and reflections
continue through the path tracer. There are no photographs or
image planes standing in for scene objects. The only texture is a runtime
Canvas2D atlas for display content and keyboard legends.

The display artwork in `js/screen.js` is a playful working desktop: a draft
called “The thing I said I’d finish today,” a small checklist, and Meoz saying
"You write. I’ll watch the tabs." Its avatar uses the blue companion face,
with a Goal and Focus status beneath it. It is an
illustrative session, with a static timer, created entirely in Canvas2D.

The mascot intentionally interprets the user's supplied blue reference as a
stylized, tactile cat. It does not replace the shipping app's canonical cream
brand assets. Anatomy and fur are procedural art rather than scanned assets.
The kitten uses a full rounded skull, small rounded ears, closer inset eyes
with dual catchlights, visible soft blush, fine whiskers and a clear lavender
“w” smile. Rounded ear roots extend inside the head, keeping their bottom
corners attached when viewed from the side. The pear chest, short thick
forelegs and compact plump paws share one continuous mesh, with pale color fading
around the toes, broad flat contact under the soles and two faint, soft toe folds.
The skull has substantial front-to-back volume, with most of the added depth
behind the face, and sits slightly lower to keep the exposed torso small.
The paws sit below the chest with a small forward projection
and a curved wrist; low blended haunches make the sitting pose readable.
The lower belly softly fills the upper paw separation, leaving a low rounded
arch between the distinct toes. The oversized head, tiny pear body, familiar
facial layout and thick curled tail retain the same character identity. Brighter pastel blue
velvet and a broad cool frontal fill keep the face legible in the warm room.
Its face is modeled in `js/cat.js`; eye and highlight patches conform to the
head's surface, and blush shares the same tilted head frame. A small head lean
faces the laptop; belly color is blended into the coat, and the curled tail
has a rounded closed tip with its root tucked into the body.

## Build and check

```sh
npm test
npm run build
```

Build emits `workroom.html` and `workroom.min.html`, self-contained pages like
the reference's ocean bundles. They need no runtime server or internet access
when the browser permits WebGPU on `file://`. Localhost is the recommended path.

From the website root, `npm ci` installs this folder as an npm workspace while
retaining its own esbuild 0.25 dependency. `npm run build` builds the workroom
and packages only its minified self-contained page at `dist/workroom/index.html`.
The website Worker serves that page at `/workroom`; trailing-slash and HTML
aliases redirect to the canonical URL while preserving camera query parameters.
Source modules, tests, review tools, package files and the local development
server are excluded from the published asset collection. Browser diagnostics
remain in the local console and are not posted to a server endpoint.

Geometry/BVH, display-density scaling, aspect-ratio limits, interaction recovery,
and continuous tube-frame regressions run with Node's built-in test runner. GPU shaders,
desktop/mobile composition, settings, camera presets, and capture are also
checked in a real WebGPU browser; a successful JavaScript build alone does not
validate the scene.

For proportion review, open `http://localhost:8081/tools/cat-review.html`.
This local development tool renders the production cat mesh as plain clay,
without fur or painted details, from the front, exact left profile and a
three-quarter angle. All three cameras are orthographic and use the same
scale; no workroom orbit/zoom limits are changed. Before/after captures live
in `shots/cat-proportions-clay-before.jpg` and `shots/cat-proportions-clay-after.jpg`.
The review tool is separate from both standalone bundles and the public UI.

Orbiting temporarily lowers trace resolution for responsiveness, then returns to
the selected resolution. Live motion is optional; the initial still is intended
to resolve cleanly. This is a procedurally sculpted artistic scene, with a
deliberately stylized mascot, rather than a photographic scan.
