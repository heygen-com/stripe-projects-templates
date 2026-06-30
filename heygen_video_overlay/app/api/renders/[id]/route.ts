import { NextResponse } from "next/server";
import { deleteJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteJob(id);
  if (!ok) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
