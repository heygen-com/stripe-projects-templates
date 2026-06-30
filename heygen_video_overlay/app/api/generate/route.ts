import { NextRequest, NextResponse } from "next/server";
import { generate } from "@/lib/pipeline";
import { getAvatar, DEFAULT_AVATAR_ID } from "@/lib/avatars";
import { writeJob } from "@/lib/jobs";
import { InsufficientCreditsError } from "@/lib/heygen";

// The pipeline shells out to the hyperframes CLI and reads/writes files — must be Node, not edge.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { title?: string; script?: string; avatarId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const script = (body.script ?? "").trim();
  if (!script) {
    return NextResponse.json({ error: "A script is required — that's what the avatar says." }, { status: 400 });
  }
  // Keep speech under the composition's ~20s body window so the fixed-length render never truncates.
  const SCRIPT_MAX = 280;
  if (script.length > SCRIPT_MAX) {
    return NextResponse.json({ error: `Script is too long (${script.length}/${SCRIPT_MAX} chars).` }, { status: 400 });
  }
  const avatar = getAvatar(body.avatarId ?? DEFAULT_AVATAR_ID);

  // Record the job as "processing" BEFORE starting work, so a page refresh can re-attach to it.
  const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await writeJob(jobId, {
    title: title || "Untitled",
    avatar: avatar?.name ?? "HeyGen",
    status: "processing",
    createdAt: new Date().toISOString(),
  });

  // Fire-and-forget: the render keeps running after the client disconnects (refresh-safe), and the
  // job sidecar is updated on completion. NOTE: in-process background work is fine for a local
  // starter; a production deploy would hand this to a queue/worker (serverless freezes after the
  // response). The client polls GET /api/renders for status.
  generate({ title, script, avatarId: body.avatarId }, jobId).catch(async (err) => {
    const billing = err instanceof InsufficientCreditsError;
    await writeJob(jobId, {
      status: "error",
      error: err?.message ?? "Generation failed.",
      billing,
      ...(billing ? { pricingUrl: "https://developers.heygen.com/docs/pricing" } : {}),
    });
    console.error("[generate]", err);
  });

  return NextResponse.json({ jobId, status: "processing" });
}
