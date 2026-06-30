import { NextRequest, NextResponse } from "next/server";
import { generate } from "@/lib/pipeline";
import { InsufficientCreditsError, HeyGenError } from "@/lib/heygen";

// The pipeline shells out to the hyperframes CLI and reads/writes files — must be Node, not edge.
export const runtime = "nodejs";
// Matting + render take minutes; don't let the platform cut the request short.
export const maxDuration = 800;

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

  try {
    const { publicUrl } = await generate({ title, script, avatarId: body.avatarId });
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      // 402 → the UI shows the "top up / check billing" CTA instead of a generic error.
      return NextResponse.json(
        { error: err.message, billing: true, pricingUrl: "https://developers.heygen.com/docs/pricing" },
        { status: 402 },
      );
    }
    const message = err instanceof HeyGenError ? err.message : "Generation failed. See server logs.";
    console.error("[generate]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
