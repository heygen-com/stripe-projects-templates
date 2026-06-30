# HeyGen templates for Stripe Projects

Starter apps for [`stripe projects build`](https://docs.stripe.com/projects) that use the
**HeyGen API** (`heygen/api`), provisioned through Stripe Projects.

Each template lives in its own self-contained subdirectory and is published to the
[`stripe/projects-template-registry`](https://github.com/stripe/projects-template-registry) via a
manifest that pins a commit in this repo.

## Templates

| Template | What it does | Stack |
|----------|--------------|-------|
| [`heygen_avatar_video/`](./heygen_avatar_video) | Prompt → an AI avatar video with motion graphics, word-synced captions, and shader transitions | Next.js · HeyGen · HyperFrames |

Scaffold one with:

```bash
stripe projects build
```

## License

[MIT](./LICENSE)
