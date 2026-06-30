# Turn this starter into a real product

You are helping me evolve this HeyGen Studio starter into my own product. Work with me, don't just
rewrite everything.

## First, understand what's here

1. Read **`AGENTS.md`** — it describes the codebase, the HeyGen + HyperFrames pipeline, and the
   render-safety rules.
2. Skim `lib/pipeline.ts`, `lib/heygen.ts`, `styles/<id>/index.html`, and `app/page.tsx` so you know
   what's wired before you change it.
3. For HeyGen API / HyperFrames / CLI specifics, use the **Docs & references** section in `AGENTS.md`
   — both doc sites have LLM-friendly `llms.txt` indexes.

## Then work in phases — ask before you build

Ask me **one discovery question at a time** until the brief is clear, e.g.:
- What is the product, and who is it for? (e.g. personalized sales videos, course intros, social clips)
- What does the user provide — just a script, or also their own data/branding/CSV?
- One avatar, or a chooser? Their own brand voice/look?
- What's the output and where does it go — download, share link, embed, a feed?

Confirm the product name and the core flow with me before writing code. Then build in phases (flow
first, polish later), checking in between phases.

## Preserve the load-bearing wiring (don't break these)

- **The pipeline contract** in `lib/pipeline.ts`: HeyGen v3 render → SRT captions →
  `hyperframes render` → trim. Keep it server-side.
- **Provisioning**: the app reads `HEYGEN_API_KEY` (provisioned by Stripe Projects). Keep
  `lib/config.ts`'s demo/live switch so it still works before a key is added.
- **HyperFrames render-safety** (see AGENTS.md): GSAP-tweens / `hf-seek` only, scalar variables,
  muted video + separate audio, the script-length cap. If you change the composition, run
  `npx hyperframes lint` and a test render.
- **Background jobs** (`lib/jobs.ts`): generation is fire-and-forget + polled, so it survives refresh.
  If you add real user accounts, move job records + videos to a DB + object storage keyed to the user.

## Make it yours

- Branding/copy: the hero, header, colors, and the composition's `brandColor`/title styling.
- Avatars: `lib/avatars.ts` (digital-twin/photo-avatar public looks, or the user's own avatars).
- The video itself: `styles/<id>/index.html` — scenes, motion, captions, transitions. Iterate with
  `cd styles/<id> && npx hyperframes preview`.
- New inputs (CSV, brand kit, a real product catalog) → new form fields + pipeline params.

Lead with the user's actual use case. Keep the integration intact; change everything above it.
