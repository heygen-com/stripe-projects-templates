// Minimal HeyGen v3 REST client. We call the API directly (not the heygen CLI binary) so the
// template is portable — no per-OS binary install. Auth is the HEYGEN_API_KEY that
// `stripe projects env --pull` provisions.
import { writeFile } from "node:fs/promises";

const API_BASE = process.env.HEYGEN_API_BASE || "https://api.heygen.com";

function apiKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) {
    throw new HeyGenError(
      "HEYGEN_API_KEY is not set. Run `stripe projects add heygen/api` and `stripe projects env --pull`, " +
        "or copy .env.example to .env.local and paste a key from https://app.heygen.com/settings/api.",
      "missing_key",
    );
  }
  return key;
}

export class HeyGenError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "HeyGenError";
  }
}

// Thrown when generation fails for billing reasons. The API route turns this into a 402 so the
// UI can show the "top up / check billing" CTA. Billing-model-agnostic: we react to the API's
// error rather than pre-checking a wallet balance (the key works regardless of billing type).
export class InsufficientCreditsError extends HeyGenError {
  constructor(message: string) {
    super(message, "insufficient_credits");
    this.name = "InsufficientCreditsError";
  }
}

const BILLING_HINTS = ["insufficient", "credit", "quota", "balance", "payment", "not enough"];

function classify(message: string, code?: string): HeyGenError {
  const haystack = `${code ?? ""} ${message}`.toLowerCase();
  if (BILLING_HINTS.some((h) => haystack.includes(h))) {
    return new InsufficientCreditsError(message);
  }
  return new HeyGenError(message, code || "api_error");
}

type CreateResult = { videoId: string };

export async function createAvatarVideo(opts: {
  avatarId: string;
  voiceId: string;
  script: string;
}): Promise<CreateResult> {
  const res = await fetch(`${API_BASE}/v3/videos`, {
    method: "POST",
    headers: { "x-api-key": apiKey(), "content-type": "application/json" },
    body: JSON.stringify({
      type: "avatar",
      avatar_id: opts.avatarId,
      voice_id: opts.voiceId,
      script: opts.script,
      // Opaque webm that carries the speech audio; shown as-is in the composition's avatar card.
      output_format: "webm",
      // Sidecar SRT (no `style` => not burned in). We import it for caption timings instead of
      // running Whisper locally — HeyGen's own timings, zero extra dependency.
      caption: { file_format: "srt" },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const msg = json?.error?.message || json?.message || `HeyGen create failed (${res.status})`;
    throw classify(msg, json?.error?.code);
  }
  const videoId = json?.data?.video_id || json?.video_id;
  if (!videoId) throw new HeyGenError("HeyGen create returned no video_id", "bad_response");
  return { videoId };
}

// Poll until the render completes, then return the signed download URLs (video + sidecar SRT).
export async function waitForVideo(
  videoId: string,
  { timeoutMs = 10 * 60_000, intervalMs = 8_000 } = {},
): Promise<{ videoUrl: string; subtitleUrl?: string }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${API_BASE}/v3/videos/${videoId}`, {
      headers: { "x-api-key": apiKey() },
    });
    const json = await res.json().catch(() => ({}));
    const data = json?.data ?? json;
    const status: string = data?.status ?? "";
    if (["completed", "success", "done"].includes(status)) {
      const videoUrl = data?.video_url || data?.url;
      if (!videoUrl) throw new HeyGenError("Completed but no video_url", "bad_response");
      return { videoUrl, subtitleUrl: data?.subtitle_url };
    }
    if (["failed", "error"].includes(status)) {
      const msg = data?.error || data?.message || "HeyGen render failed";
      throw classify(typeof msg === "string" ? msg : JSON.stringify(msg), data?.error?.code);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new HeyGenError("Timed out waiting for HeyGen render", "timeout");
}

// Account info for the header greeting + wallet balance. Balance shape depends on billing_type
// (wallet / subscription / usage_based), so we surface a friendly label rather than a raw number.
export async function getAccount(): Promise<{ firstName: string; email: string; balance: string | null }> {
  const res = await fetch(`${API_BASE}/v3/users/me`, { headers: { "x-api-key": apiKey() } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new HeyGenError(json?.error?.message || `account fetch failed (${res.status})`, "account");
  const d = json?.data ?? json;
  let balance: string | null = null;
  const w = d?.wallet;
  if (w?.remaining_balance != null) {
    balance = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (w.currency || "usd").toUpperCase(),
    }).format(w.remaining_balance);
  } else if (typeof d?.remaining_balance === "number") {
    balance = `$${d.remaining_balance.toFixed(2)}`;
  } else if (typeof d?.remaining === "number") {
    balance = `${d.remaining} credits`;
  }
  return { firstName: d?.first_name || "", email: d?.email || "", balance };
}

export async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new HeyGenError(`Download failed (${res.status})`, "download_failed");
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}
