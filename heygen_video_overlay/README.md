# HeyGen AI Video Overlay

A Next.js starter that turns a **title + script** into a branded AI video: a HeyGen avatar
presenting over motion graphics, with **word-synced captions**. The avatar runs on the **HeyGen
API** (`heygen/api`) that Stripe Projects provisions; everything else renders **locally and free**
with [HyperFrames](https://hyperframes.heygen.com).

## What you get

- A one-page web app: pick one of 3 avatars, write a script, generate, watch the result.
- A server-side pipeline: HeyGen v3 render → local background removal → transcription → HyperFrames render.
- Zero secrets in the repo — the API key arrives via `stripe projects env --pull`.

## Run it

```bash
pnpm install        # installs Next.js, HyperFrames (pinned), and bundled FFmpeg
pnpm dev            # runs a preflight, then starts the app at http://localhost:3000
```

If you didn't scaffold via Stripe Projects, copy `.env.example` to `.env.local` and paste a key
from <https://app.heygen.com/settings/api>.

**First run is slow:** HyperFrames downloads a headless Chrome and the u2net background-removal
model (~168 MB) the first time. Subsequent runs are fast. You need **Node ≥ 22**; FFmpeg is bundled
(`ffmpeg-static`), so no system install is required. (Captions come from HeyGen's own subtitle file —
no speech-to-text model to download.)

## How it works

Generating one video runs four steps server-side (`lib/pipeline.ts`):

| Step | Tool | Cost |
|------|------|------|
| 1. Generate avatar | HeyGen v3 API (`POST /v3/videos`, `output_format: webm`) | **paid** (HeyGen credits) |
| 2. Cut out the background | `hyperframes remove-background` (u2net) → transparent webm | free, local (~minutes on CPU) |
| 3. Captions | HeyGen sidecar SRT → `hyperframes transcribe` (format import, no Whisper) | free, local |
| 4. Render the composition | `hyperframes render` (avatar cutout + captions + motion graphics) | free, local |

The HeyGen webm is opaque but carries the speech audio, and HeyGen returns a matching SRT. Background
removal produces a transparent, **video-only** cutout, so the composition uses the cutout as a muted
video layer and the original render as the audio track, with captions from the SRT. Generating spends credits ([pay-as-you-go pricing](https://developers.heygen.com/docs/pricing));
the local steps don't.

## Make it yours

- **Avatars:** `lib/avatars.ts` — three validated public digital-twin looks. Swap in others from
  `heygen avatar looks list --ownership public --avatar-type digital_twin` (must support Avatar IV/V).
- **The video itself:** `composition/` is a HyperFrames project. `cd composition && npx hyperframes preview`
  to edit the title card, captions, motion, and transitions live.
- **Turn it into a product** with your AI coding tool of choice, pointed at this repo.

## Deploying

This v1 is **local-first**: rendering needs headless Chrome + FFmpeg, which serverless hosts
(e.g. Vercel functions) can't run. To deploy, move the pipeline to a worker or container with those
tools, or use HyperFrames cloud rendering. The web UI itself deploys anywhere.
