import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/session";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const user = process.env.ADMIN_USERNAME || "admin";
  const pass = process.env.ADMIN_PASSWORD || "";

  if (parsed.data.username !== user || parsed.data.password !== pass) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const session = await getAdminSession();
  session.isAdmin = true;
  await session.save();

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getAdminSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getAdminSession();
  return NextResponse.json({ isAdmin: Boolean(session.isAdmin) });
}
