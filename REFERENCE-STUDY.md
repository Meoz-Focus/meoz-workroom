# web-ocean study

Source: https://github.com/Noniv/web-ocean
Local untouched study checkout: `reference/web-ocean/`
Studied commit: `a07c7fd522ef0a897601c114f927a49d93d95520` (MIT).

The source uses native browser JavaScript ES modules, WebGPU, hand-written WGSL,
HTML/CSS, a dependency-free Node HTTP server, and esbuild ^0.25.0 as its only
development dependency. There is no Three.js, Babylon, React, asset loader, or
rendering engine. Its build emits readable and minified self-contained HTML.

Read README, package/build/server, device setup and frame resource management in
js/main.js, and common/post shader modules. Important patterns retained here:
explicit GPU resource ownership, compute work, linear HDR rendering, a separate
tone-mapping pass, resolution controls, camera controls, and standalone bundles.

The ocean specializes in FFT simulation, atmospheric scattering and ocean LOD.
Those systems do not describe a tabletop. This study instead implements a custom
triangle BVH path tracer, physically based materials, next-event lighting,
progressive accumulation, depth/normal-aware filtering and a thin-lens camera.
All scene geometry, skin, fur, wood grain, screen and keyboard legends are
procedural and deterministic. No external models, images, fonts or CDN runtime.

The supplied blue mascot image is the visual brief for this standalone scene;
the shipping app's current canonical icon is cream. This scene does not replace
or modify any canonical brand asset or production application.
