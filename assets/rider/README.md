# Meadow rider hands — WRAD ARMS adaptation

Current hands derive from **WRAD ARMS by wriks**, licensed **CC0 1.0 Universal**.

- Author source: https://github.com/wwwriks/wrad-arms
- Author product page: https://wriks.itch.io/wrad-arms
- Acquired: 2026-11-03; price: free, no purchase made.
- Original model, README and complete CC0 dedication: `vendor/wrad-arms/`.
- CC0 permits commercial use, modification and redistribution without attribution requirements. Source and license are retained for provenance.

The source was selected over the $2 AUD dave3d 322-triangle hand (commercial use permitted) and the non-commercial-only 3DHaupt free hand. WRAD includes the forearm, finger skeleton and Blender source at no acquisition cost. It is a low-poly artistic model, not a scan of a real person's hand.

## Adaptation

`scripts/adapt_wrad_hands.py` loads the donor with automatic scripts disabled, poses the right-hand finger bones around the bike grip, crops at the forearm, closes the cut, applies two levels of subdivision, and adjusts wrist alignment. The left hand is mirrored at runtime. The original textures are replaced by Meadow's existing soft skin material.

The edited `.blend` retains the posed donor rig (hidden) and the exported game mesh. The game mesh has 4,474 vertices / 8,944 triangles per hand and forearm. Tests confirm a single closed connected skin surface and unchanged hand contact during forearm motion. The game deforms the proximal forearm while the hand stays fixed on the moving grip.

Files:
- `meadow-hands.blend`: editable adaptation, including donor rig.
- `meadow-hands.glb`: portable adapted mesh.
- `hand-mesh.js`: same adapted mesh data used by Three.js.
- `previous-procedural/`: previous original hand saved for comparison.
- `references/`: earlier generated photo studies and prompts.

Rebuild from the author asset:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec --python scripts/adapt_wrad_hands.py
```

`build_rider_hands.py` is the legacy procedural generator; running it overwrites the current adaptation, so use the command above for the current hands.
