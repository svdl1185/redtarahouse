import { NextResponse } from "next/server";
import { buildOutboundIcal } from "@/lib/ical";

export async function GET() {
  const ical = await buildOutboundIcal();
  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="red-tara-sanctuary.ics"',
      "Cache-Control": "no-cache, max-age=0",
    },
  });
}
