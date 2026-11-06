# Countryside vegetation

Author: **Quaternius**. Pack: **Ultimate Stylized Nature Pack**.
License: **CC0 1.0 Universal** (free personal and commercial use, modification permitted).

- Official pack and license statement: https://quaternius.com/packs/ultimatestylizednature.html
- License terms: https://creativecommons.org/publicdomain/zero/1.0/
- Author collection: https://poly.pizza/bundle/Ultimate-Stylized-Nature-Pack-zyIyYd9yGr
- `vendor/flowers.glb`: https://poly.pizza/m/NBUxHir6FJ
- `vendor/grass.glb`: https://poly.pizza/m/UGTOzcO3P2
- `vendor/birch.glb`: https://poly.pizza/m/R7qMWzb7nk

Retrieved 2026-11-03. Vendor GLBs are retained unchanged. Runtime adaptation in
`src/vegetation.js` selects five flower clumps, two grass types and five birches,
normalizes ground/height, applies matte pastel materials, alpha cutouts and wind.
Grass uses a solid sage material to match the game's palette. Repeated plants use
instancing and share geometry/materials across streamed terrain chunks.
`src/scenery.js` arranges irregular flower drifts, roadside tufts and tree groves.

No paid subscription or paid asset license is required for these assets.
