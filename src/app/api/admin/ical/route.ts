import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { syncAllIcalSources, syncIcalSource } from "@/lib/ical";
import { getAdminSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const sources = await prisma.icalSource.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { blocks: true } } },
  });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return NextResponse.json({
    sources,
    outboundUrl: `${siteUrl}/api/calendar`,
  });
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  url: z.string().url(),
});

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const json = await request.json();

  if (json.action === "sync") {
    if (json.id) {
      const count = await syncIcalSource(json.id);
      return NextResponse.json({ ok: true, count });
    }
    const results = await syncAllIcalSources();
    return NextResponse.json({ ok: true, results });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }
  const source = await prisma.icalSource.create({ data: parsed.data });
  try {
    await syncIcalSource(source.id);
  } catch {
    // keep source even if first sync fails
  }
  return NextResponse.json({ source });
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.icalSource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
