import { NextResponse } from "next/server";
import { getAccount } from "@/lib/heygen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Header greeting + wallet balance. Best-effort: if there's no key yet (not provisioned), return
// empties so the page still renders.
export async function GET() {
  try {
    return NextResponse.json(await getAccount());
  } catch {
    return NextResponse.json({ firstName: "", email: "", balance: null });
  }
}
