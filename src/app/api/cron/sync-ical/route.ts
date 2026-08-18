import { NextResponse } from "next/server";
import { syncAllIcalSources } from "@/lib/ical";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  const authorized =
    (cronSecret && auth === `Bearer ${cronSecret}`) ||
    (cronSecret && key === cronSecret) ||
    (!cronSecret && process.env.NODE_ENV !== "production");

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await syncAllIcalSources();
  return NextResponse.json({ ok: true, results, syncedAt: new Date().toISOString() });
}
