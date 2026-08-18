import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
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
  const overrides = await prisma.rateOverride.findMany({
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json({ overrides });
}

const createSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekdayRate: z.number().int().min(0),
  weekendRate: z.number().int().min(0),
  note: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success || parsed.data.endDate < parsed.data.startDate) {
    return NextResponse.json({ error: "Invalid override" }, { status: 400 });
  }
  const override = await prisma.rateOverride.create({ data: parsed.data });
  return NextResponse.json({ override });
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.rateOverride.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
