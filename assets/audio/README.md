# Nature audio

## Grass tumble comfort line (private prototype)

`fall-comfort.mp3`: generated 2026-11-04 using Microsoft Edge neural TTS through edge-tts,
voice `zh-CN-YunxiNeural`, rate -4%, original text: “没关系，没什么大不了。”
This is a synthetic voice, not a recording of an identifiable person and not claimed CC0.
Service terms apply; no third-party recording was imported.
Earshot local measurement: 3.072 seconds, -19.5 LUFS integrated, -6.6 dBTP,
0 clipped samples; AudioSet Speech 0.829. Speech wording and naturalness were not
verified by speech recognition or a human listening test. Keep playback low and
honour the existing sound-off preference; subtitle remains available without audio.

Bird recording: **Ambient Bird Sounds**, by **isaiah658**, CC0.
Source and author license statement: https://opengameart.org/content/ambient-bird-sounds
Downloaded 2026-11-03. Original: `birds-isaiah658.ogg`.
Game uses mono 22.05 kHz excerpts at 6–8.5, 15–17.5 and 27–29.5 seconds,
with 700 Hz high-pass, 6500 Hz low-pass, gentle fades and 2x gain before spatial attenuation.
CC0 allows commercial use and modification. Attribution retained voluntarily.

Wind is original procedural synthesis (`src/wind-audio.js`).
Wind master gain reduced approximately 11 dB from its initial version.
Bird calls use fixed tree coordinates, HRTF spatialization and inverse-distance attenuation;
listener position/orientation follows the camera. One 2.5-second call every 10–18 seconds centrally, or 8–16 seconds on rough shoulders (preferring same-side trees),
only within 38 metres of a tree perch. This is a lightweight spatial approximation,
not acoustic ray tracing; no obstacle occlusion or Doppler simulation.

## Background music

First Light Particles — Yoiyami, CC0 1.0.
Source: https://opengameart.org/content/first-light-particles-%E2%80%93-cc0-atmospheric-pianoambient-track
Original downloaded 2026-11-03 as `first-light-particles-original.wav`, retained unchanged.
`first-light-particles-game.mp3` is a derived 160 kbps web playback copy, with 3-second intro and 4-second outro fades.
Player volume is 0.20 (about -14 dB relative to source), with independent persistent toggle,
fade on start/pause, and looping. Playback resumes at the current position after pausing.
Earshot spot-check (25–45 seconds of original): Piano 0.33, Music 0.78, -22.3 LUFS;
intended playback for that section is approximately -36 LUFS before device volume.
