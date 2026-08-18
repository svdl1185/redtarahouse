import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type AdminSession = {
  isAdmin?: boolean;
};

export function getSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return {
    password,
    cookieName: "redtara_admin",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}

export async function getAdminSession() {
  return getIronSession<AdminSession>(await cookies(), getSessionOptions());
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    throw new Error("Unauthorized");
  }
  return session;
}
