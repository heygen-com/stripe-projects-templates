# AGENTS.md — HeyGen Studio (heygen_avatar_video)

Guidance for AI coding tools (Claude, Codex, etc.) working in this template. Read this before
editing, then see `prompts/starter-to-product.md` for the "turn this into a real product" flow.

## What this app is

A Next.js starter that turns a **title + script + chosen avatar** into a branded AI video: a
**HeyGen** avatar composed over motion graphics with synced captions, rendered locally with
**HyperFrames**. It's a dual showcase — the HeyGen API does the avatar; HyperFrames is the local,
free "production studio" that wraps it. The HeyGen API key is provisioned via **Stripe Projects**.

## The pipeline (the integration — start here)

`lib/pipeline.ts` orchestrates one generation, all server-side:

1. **HeyGen v3 REST (paid)** — `POST /v3/videos` `{ type:"avatar", avatar_id, voice_id, script,
   output_format:"mp4", caption:{file_format:"srt"} }`; poll `GET /v3/videos/{id}`; download the
   opaque mp4 (carries the speech audio) + the sidecar **SRT**. MP4, not webm: webm output is
   alpha-matted, so the shader would show through the avatar card. (`lib/heygen.ts`)
2. **Captions (free, local)** — `hyperframes transcribe captions.srt` → a list-shaped
   `transcript.json` (cues). No speech-to-text model; HeyGen's own timings.
3. **Render (free, local)** — stage `avatar.mp4` + `transcript.json` into `composition/assets/`,
   write scalar variables (title/brand/timing) to a JSON file, run `hyperframes render
   --variables-file`, then `ffmpeg-static` trims to the real length.

**Demo vs live (`lib/config.ts`):** with no `HEYGEN_API_KEY`, `POST /api/generate` skips the paid
pipeline and returns the bundled `public/demo.mp4` labeled as a demo. Provisioning the key flips to
live. So the app works with zero config.

## Layout

| Path | What it is |
|------|-----------|
| `app/page.tsx` | The whole UI (client): hero, sample modal, Create (form + player), Library, header. |
| `app/api/generate/route.ts` | Starts a generation as a **fire-and-forget background job**; returns a `jobId` immediately (refresh-safe). Demo-mode short-circuit lives here. |
| `app/api/renders/route.ts` + `[id]/route.ts` | List jobs / delete one. |
| `app/api/account/route.ts` | Header greeting + wallet balance (`GET /v3/users/me`). |
| `lib/pipeline.ts` | The generation pipeline (above). |
| `lib/heygen.ts` | HeyGen v3 REST client + typed errors (`InsufficientCreditsError` → 402). |
| `lib/avatars.ts` | The 3 shipped public avatars (id + voice + thumbnail). |
| `lib/jobs.ts` | On-disk job records (`public/renders/<id>.json`) — status, list, delete. |
| `composition/` | The HyperFrames project (fixed template; see below). |
| `scripts/preflight.mjs` | Pre-`dev` dependency check. |

## The composition (`composition/index.html`)

A **fixed** HyperFrames template — its structure doesn't change per video. Per generation it's
parametrized with **scalar variables** (`getVariables()`: title, tagline, brandColor, timing) and
**staged assets** (`assets/avatar.mp4`, `assets/transcript.json`). Scenes: shader-background intro
title card → avatar in a glassy card + word-synced captions → outro.

**Render-safety rules (important):**
- All visual motion is **GSAP tweens** (applied on seek) or driven by the **`hf-seek` event** — never
  GSAP `onUpdate` (doesn't fire during render seeking). Captions + the WebGL shader use `hf-seek`.
- Variables are **scalars only** (string/number/color/boolean/enum). Media + caption cues go through
  `assets/` files, not variables.
- Video layers must be `muted` (HyperFrames mutes them); the speech is a separate `<audio>` track.
- The composition root is a fixed 25s, trimmed after render — so the **script is capped at 280 chars**
  (UI + server) to stay within the body window.

## Common changes

- **Swap/add avatars:** edit `lib/avatars.ts`. Must be **digital-twin or photo-avatar** public looks
  (studio avatars are Avatar III and rejected by `/v3/videos`). Find them with
  `heygen avatar looks list --ownership public --avatar-type digital_twin`. Each needs a `voice_id`.
- **Change the video look:** edit `composition/index.html` — `cd composition && npx hyperframes
  preview` to iterate live; `npx hyperframes lint` before committing. Keep the render-safety rules.
- **Different output (e.g. 9:16):** the composition `data-resolution` + the avatar `aspect_ratio` in
  the `POST /v3/videos` body in `lib/heygen.ts`.
- **Production:** jobs are in-process + on-disk (fine locally); a real deploy needs a queue/worker +
  DB/object storage, and rendering needs headless Chrome + FFmpeg (not serverless). See README.

## Commands

```bash
pnpm install          # runs native builds (ffmpeg-static, onnxruntime)
pnpm dev              # preflight + Next dev at :3000
cd composition && npx hyperframes preview   # iterate on the composition
cd composition && npx hyperframes lint      # validate before committing
```

Requires **Node ≥ 22**. FFmpeg is bundled (`ffmpeg-static`); first render downloads a headless Chrome.
