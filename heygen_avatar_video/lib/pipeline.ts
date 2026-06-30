// Orchestrates one generation end to end:
//   HeyGen v3 render (opaque mp4 + audio + sidecar SRT) → import SRT for captions
//   → HyperFrames render of the final composition → ffmpeg trim.
// Everything after the HeyGen call is free and local. The opaque avatar plays (muted) in a card
// and the same file is the <audio> track.
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, rm, copyFile } from "node:fs/promises";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import { createAvatarVideo, waitForVideo, download } from "./heygen";
import { getAvatar, DEFAULT_AVATAR_ID } from "./avatars";
import { getStyle } from "./styles";
import { writeJob } from "./jobs";

const ROOT = process.cwd();
const STYLES_DIR = path.join(ROOT, "styles"); // one HyperFrames project per composition style
const INTRO_MS = 2500; // silent title-card intro; speech/captions/avatar are all offset by this
const OUTRO_MS = 2500;

// Expose the bundled ffmpeg to the hyperframes subprocess so a clean machine needs no system
// FFmpeg (hyperframes render + transcribe shell out to ffmpeg).
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

// Serialize the stage→render→trim section per style: styles/<id>/assets/ is a single shared slot,
// so two concurrent jobs of the SAME style would clobber each other. Keyed by style id, so
// different styles still render in parallel; same-style jobs queue (the paid HeyGen step is always
// parallel — it runs before the lock).
const renderLocks = new Map<string, Promise<void>>();
function withRenderLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = renderLocks.get(key) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  renderLocks.set(
    key,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
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

export type GenerateInput = { title: string; script: string; avatarId?: string; style?: string };
export type GenerateResult = { videoPath: string; publicUrl: string };

// jobId is created by the caller (the route) so it can record a "processing" job before this
// background work starts — that's what makes generation survive a page refresh.
export async function generate(
  input: GenerateInput,
  jobId: string,
  onStep?: (step: string) => void,
): Promise<GenerateResult> {
  const avatar = getAvatar(input.avatarId ?? DEFAULT_AVATAR_ID);
  if (!avatar) throw new Error("Unknown avatar");
  const style = getStyle(input.style); // falls back to the default style on unknown/missing
  const compDir = path.join(STYLES_DIR, style.id);

  const work = path.join(ROOT, "work", jobId);
  await mkdir(work, { recursive: true });
  const avatarFile = path.join(work, "avatar.mp4");
  const captionsSrt = path.join(work, "captions.srt");

  // 1. HeyGen avatar (paid) — opaque MP4 carrying the speech audio + a sidecar SRT. MP4 (not webm)
  //    so the avatar keeps its own background; webm output is alpha-matted and would show the
  //    composition shader through the card. We present the opaque render as-is in a framed card.
  onStep?.("avatar");
  const { videoId } = await createAvatarVideo({
    avatarId: avatar.id,
    voiceId: avatar.voiceId,
    script: input.script,
  });
  const { videoUrl, subtitleUrl } = await waitForVideo(videoId);
  await download(videoUrl, avatarFile);

  // 2. Captions (free) — import HeyGen's SRT (HeyGen's own timings; no Whisper). `transcribe` on an
  //    .srt is a pure format conversion to transcript.json (a list of {text,start,end,id} cues).
  onStep?.("transcribe");
  if (!subtitleUrl) throw new Error("HeyGen returned no subtitle_url (caption sidecar missing)");
  await download(subtitleUrl, captionsSrt);
  await run(["transcribe", captionsSrt], work);
  const cues = JSON.parse(await readFile(path.join(work, "transcript.json"), "utf8"));
  const speechMs = durationMs(cues);

  // 3. Stage assets + render the chosen style. HyperFrames variables are scalars only
  //    (string/number/color/...), so media + caption cues go through files in styles/<id>/assets/
  //    while text/timing go through --variables-file. The avatar plays muted; the same file is the
  //    <audio> track. styles/<id>/assets/ is a SHARED slot, so the stage→render is serialized per
  //    style (the paid HeyGen step above already ran in parallel).
  onStep?.("render");
  const out = path.join("public", "renders", `${jobId}.mp4`);
  await withRenderLock(style.id, async () => {
    const assets = path.join(compDir, "assets");
    await mkdir(assets, { recursive: true });
    await copyFile(avatarFile, path.join(assets, "avatar.mp4"));
    await copyFile(path.join(work, "transcript.json"), path.join(assets, "transcript.json"));

    const vars = {
      title: input.title,
      tagline: style.tagline,
      brandColor: style.accent,
      speechStartMs: INTRO_MS,
      introDurationMs: INTRO_MS,
      bodyDurationMs: speechMs,
      outroDurationMs: OUTRO_MS,
      durationMs: INTRO_MS + speechMs + OUTRO_MS,
    };
    const varsFile = path.join(work, "vars.json");
    await writeFile(varsFile, JSON.stringify(vars));

    await mkdir(path.join(ROOT, "public", "renders"), { recursive: true });
    const rendered = path.join(work, "rendered.mp4");
    await run(["render", "--variables-file", varsFile, "-o", rendered], compDir);
    await trim(rendered, path.join(ROOT, out), vars.durationMs / 1000);
  });

  // Mark the job done; the mp4 is on disk and the gallery/Library reads this sidecar.
  const url = `/renders/${jobId}.mp4`;
  await writeJob(jobId, { status: "done", url });

  // Drop the per-job working dir; leave styles/<id>/assets/ in place (it holds the latest render's
  // staged inputs, overwriting the shipped Melina sample — fine for a local scaffold).
  await rm(work, { recursive: true, force: true }).catch(() => {});
  return { videoPath: out, publicUrl: url };
}

// transcript.json (from SRT import) is a list of cues with second-based times; speech length = last cue end.
function durationMs(cues: { end?: number }[]): number {
  const lastEnd = cues.length ? (cues[cues.length - 1].end ?? 0) : 0;
  return Math.max(1000, Math.round(lastEnd * 1000));
}
