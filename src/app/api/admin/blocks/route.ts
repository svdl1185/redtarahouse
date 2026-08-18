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
  const blocks = await prisma.blockedDate.findMany({ orderBy: { startDate: "asc" } });
  return NextResponse.json({ blocks });
}

const createSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success || parsed.data.endDate <= parsed.data.startDate) {
    return NextResponse.json({ error: "Invalid block range" }, { status: 400 });
  }

  const block = await prisma.blockedDate.create({ data: parsed.data });
  return NextResponse.json({ block });
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await prisma.blockedDate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
