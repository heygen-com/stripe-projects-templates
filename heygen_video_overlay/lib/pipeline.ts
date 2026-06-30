// Orchestrates one generation end to end:
//   HeyGen v3 render (opaque webm + audio) → local u2net cutout (alpha, no audio)
//   → transcribe the original audio (captions) → HyperFrames render of the final composition.
// Everything after the HeyGen call is free and local. The cutout is the visible (muted) avatar
// layer; the ORIGINAL render is the audio track — the cutout has no audio.
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, rm, copyFile } from "node:fs/promises";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import { createAvatarVideo, waitForVideo, download } from "./heygen";
import { getAvatar, DEFAULT_AVATAR_ID } from "./avatars";

const ROOT = process.cwd();
const COMPOSITION_DIR = path.join(ROOT, "composition");
const INTRO_MS = 2500; // silent title-card intro; speech/captions/avatar are all offset by this
const OUTRO_MS = 2500;

// Expose the bundled ffmpeg to the hyperframes subprocess so a clean machine needs no system
// FFmpeg (hyperframes render + transcribe + remove-background all shell out to ffmpeg).
function hyperframesEnv(): NodeJS.ProcessEnv {
  const ffmpegDir = ffmpegStatic ? path.dirname(ffmpegStatic) : "";
  return {
    ...process.env,
    PATH: ffmpegDir ? `${ffmpegDir}${path.delimiter}${process.env.PATH ?? ""}` : process.env.PATH,
    FFMPEG_PATH: ffmpegStatic || process.env.FFMPEG_PATH || "",
  };
}

function run(args: string[], cwd = ROOT): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn("npx", ["--no-install", "hyperframes", ...args], {
      cwd,
      env: hyperframesEnv(),
      stdio: "inherit",
    });
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`hyperframes ${args[0]} exited ${code}`)),
    );
  });
}

function trim(input: string, output: string, seconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegStatic) return reject(new Error("ffmpeg-static missing"));
    const p = spawn(
      ffmpegStatic,
      ["-y", "-i", input, "-t", String(seconds), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", output],
      { stdio: "inherit" },
    );
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg trim exited ${code}`))));
  });
}

export type GenerateInput = { title: string; script: string; avatarId?: string };
export type GenerateResult = { videoPath: string; publicUrl: string };

export async function generate(
  input: GenerateInput,
  onStep?: (step: string) => void,
): Promise<GenerateResult> {
  const avatar = getAvatar(input.avatarId ?? DEFAULT_AVATAR_ID);
  if (!avatar) throw new Error("Unknown avatar");

  const jobId = `${Date.now().toString(36)}`;
  const work = path.join(ROOT, "work", jobId);
  await mkdir(work, { recursive: true });
  const avatarWebm = path.join(work, "avatar.webm");
  const captionsSrt = path.join(work, "captions.srt");

  // 1. HeyGen avatar (paid) — opaque webm carrying the speech audio + a sidecar SRT. We present it
  //    in a framed card (no background removal), so the opaque render is used as-is.
  onStep?.("avatar");
  const { videoId } = await createAvatarVideo({
    avatarId: avatar.id,
    voiceId: avatar.voiceId,
    script: input.script,
  });
  const { videoUrl, subtitleUrl } = await waitForVideo(videoId);
  await download(videoUrl, avatarWebm);

  // 2. Captions (free) — import HeyGen's SRT (HeyGen's own timings; no Whisper). `transcribe` on an
  //    .srt is a pure format conversion to transcript.json (a list of {text,start,end,id} cues).
  onStep?.("transcribe");
  if (!subtitleUrl) throw new Error("HeyGen returned no subtitle_url (caption sidecar missing)");
  await download(subtitleUrl, captionsSrt);
  await run(["transcribe", captionsSrt], work);
  const cues = JSON.parse(await readFile(path.join(work, "transcript.json"), "utf8"));
  const speechMs = durationMs(cues);

  // 3. Stage assets the composition reads at fixed paths. HyperFrames variables are scalars only
  //    (string/number/color/boolean/enum), so media + the caption cues go through files in
  //    composition/assets/, while text + timing go through --variables-file. The card shows the
  //    avatar.webm muted; the same file is the <audio> track (HyperFrames mutes video layers).
  //    NOTE: assets/ is a single shared slot — local dev renders one video at a time.
  onStep?.("render");
  const assets = path.join(COMPOSITION_DIR, "assets");
  await mkdir(assets, { recursive: true });
  await copyFile(avatarWebm, path.join(assets, "avatar.webm"));
  await copyFile(path.join(work, "transcript.json"), path.join(assets, "transcript.json"));

  const vars = {
    title: input.title,
    tagline: "Built with HeyGen · provisioned via Stripe Projects",
    brandColor: "#6d4aff",
    speechStartMs: INTRO_MS,
    introDurationMs: INTRO_MS,
    bodyDurationMs: speechMs,
    outroDurationMs: OUTRO_MS,
    durationMs: INTRO_MS + speechMs + OUTRO_MS,
  };
  const varsFile = path.join(work, "vars.json");
  await writeFile(varsFile, JSON.stringify(vars));

  await mkdir(path.join(ROOT, "public", "renders"), { recursive: true });
  const out = path.join("public", "renders", `${jobId}.mp4`);
  const rendered = path.join(work, "rendered.mp4");
  await run(["render", "--variables-file", varsFile, "-o", rendered], COMPOSITION_DIR);

  // The composition root is a generous fixed length; trim to the real intro+speech+outro so there's
  // no trailing dead air. Re-encode (clips are short) for a frame-accurate cut.
  await trim(rendered, path.join(ROOT, out), vars.durationMs / 1000);

  // Drop the per-job working dir; leave composition/assets/ in place (it holds the latest render's
  // staged inputs, overwriting the shipped Melina sample — fine for a local scaffold).
  await rm(work, { recursive: true, force: true }).catch(() => {});
  return { videoPath: out, publicUrl: `/renders/${jobId}.mp4` };
}

// transcript.json (from SRT import) is a list of cues with second-based times; speech length = last cue end.
function durationMs(cues: { end?: number }[]): number {
  const lastEnd = cues.length ? (cues[cues.length - 1].end ?? 0) : 0;
  return Math.max(1000, Math.round(lastEnd * 1000));
}
