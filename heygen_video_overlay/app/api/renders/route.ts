import { NextResponse } from "next/server";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // always reflect the latest renders on disk

// Lists previously generated videos from their metadata sidecars in public/renders/, newest first.
// The mp4s persist on disk, so a refresh never loses a paid render — this surfaces them.
export async function GET() {
  const dir = path.join(process.cwd(), "public", "renders");
  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch {
    return NextResponse.json({ videos: [] }); // no renders yet
  }
  const metas = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        try {
          return JSON.parse(await readFile(path.join(dir, f), "utf8"));
        } catch {
          return null;
        }
      }),
  );
  const videos = metas
    .filter(Boolean)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json({ videos });
}
