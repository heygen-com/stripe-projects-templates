# composition/ — the HyperFrames project

This is the **fixed** HyperFrames template the app renders for every video (`index.html`). The app
stages `assets/avatar.mp4` + `assets/transcript.json` and passes scalar variables, then runs
`hyperframes render`. For the big picture (the HeyGen→render pipeline, where this fits), read the
template's top-level [`../AGENTS.md`](../AGENTS.md).

## Iterate

```bash
npx hyperframes preview      # live editor
npx hyperframes lint         # validate before committing
npx hyperframes render -o out.mp4   # one-off render with the sample assets in ./assets
```

## Render-safety rules (must hold — the app renders this headless)

- **Time-driven visuals use GSAP tweens or the `hf-seek` event — never GSAP `onUpdate`** (it doesn't
  fire during render seeking). Captions and the WebGL shader background read `hf-seek`.
- **Variables are scalars only** (`getVariables()`: title, tagline, brandColor, timing). Media and
  caption cues come from `assets/` files, not variables.
- **Video layers are `muted`**; the speech is a separate `<audio>` element (same source file).
- Captions are HeyGen SRT cues offset by `speechStartMs` (intro length) so they line up with the body.
- The root is a fixed 25s (the app trims after render); the app caps the script to fit the body window.

## Scenes

Intro title card (gradient-masked type) over a WebGL shader background → body: avatar in a glassy card
+ word-synced captions → outro CTA with the HeyGen orb. Edit freely, but keep the rules above and
re-run `lint` + a test render.
