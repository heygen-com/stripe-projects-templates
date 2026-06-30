// Demo/live switch (mirrors Mixpanel's lib/config). With no HeyGen key — e.g. a fresh scaffold
// before `stripe projects add heygen/api` + `env --pull` — the app runs in DEMO mode: Generate
// returns the bundled sample instead of erroring, so the template "immediately works". Provisioning
// (or a pasted HEYGEN_API_KEY) flips it to LIVE, rendering the user's actual script.
export function hasHeyGenKey(): boolean {
  return Boolean(process.env.HEYGEN_API_KEY && process.env.HEYGEN_API_KEY.trim());
}

export const DEMO_URL = "/demo.mp4";
