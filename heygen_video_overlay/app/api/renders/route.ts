import { NextResponse } from "next/server";
import { listJobs } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // always reflect the latest jobs on disk

// Lists all render jobs (processing / done / error), newest first. The mp4s persist on disk, so a
// refresh never loses a paid render, and in-flight jobs are re-discoverable here.
export async function GET() {
  return NextResponse.json({ videos: await listJobs() });
}
