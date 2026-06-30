// Runs before `dev`. Verifies the render toolchain so the first generation doesn't fail
// mid-way on a clean machine. hyperframes downloads Chrome / Whisper / u2net models on first
// use; we surface that here rather than letting it stall a request.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function ok(m) {
  console.log(`  ✓ ${m}`);
}
function warn(m) {
  console.log(`  ⚠ ${m}`);
}

console.log("HeyGen Video Overlay — preflight");

const [maj] = process.versions.node.split(".").map(Number);
if (maj < 22) {
  console.error(`  ✗ Node ${process.versions.node} — HyperFrames needs Node >= 22.`);
  process.exit(1);
}
ok(`Node ${process.versions.node}`);

// Point hyperframes at the bundled ffmpeg so no system FFmpeg is required.
let ffmpeg;
try {
  ffmpeg = require("ffmpeg-static");
  ok(`bundled ffmpeg (${path.basename(ffmpeg)})`);
} catch {
  warn("ffmpeg-static not installed — run `pnpm install`");
}
const env = {
  ...process.env,
  FFMPEG_PATH: ffmpeg || process.env.FFMPEG_PATH || "",
  PATH: ffmpeg ? `${path.dirname(ffmpeg)}${path.delimiter}${process.env.PATH ?? ""}` : process.env.PATH,
};

const doctor = spawnSync("npx", ["--no-install", "hyperframes", "doctor"], { env, encoding: "utf8" });
if (doctor.status === 0) ok("hyperframes doctor passed");
else warn("hyperframes doctor reported issues — see `npx hyperframes doctor`. Chrome/models download on first render.");

if (!process.env.HEYGEN_API_KEY) {
  warn(
    "HEYGEN_API_KEY not set — generation will fail until you run `stripe projects env --pull` " +
      "(or copy .env.example to .env.local). The app still starts.",
  );
} else {
  ok("HEYGEN_API_KEY present");
}
console.log("Ready. Starting Next.js…\n");
