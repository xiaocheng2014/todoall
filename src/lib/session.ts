import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { shouldUseSecureSessionCookie } from "@/lib/session-cookie";

const SESSION_COOKIE_NAME = "todoall_session";

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionTtlDays(): number {
  const value = Number(process.env.SESSION_TTL_DAYS ?? "30");
  return Number.isFinite(value) && value > 0 ? value : 30;
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + sessionTtlDays() * 24 * 60 * 60 * 1000,
  );

  await db.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  const requestHeaders = await headers();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureSessionCookie(
      process.env.SESSION_COOKIE_SECURE,
      requestHeaders.get("x-forwarded-proto"),
    ),
    expires: expiresAt,
    path: "/",
  });
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await db.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: {
        select: {
          id: true,
          loginName: true,
          displayName: true,
          role: true,
          status: true,
          mustChangePassword: true,
          timezone: true,
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.user.status !== "ACTIVE"
  ) {
    return null;
  }

  return { session, tokenHash: hashSessionToken(token) };
}

export async function requireUser() {
  const current = await getCurrentSession();

  if (!current) {
    redirect("/login");
  }

  return current;
}

export async function requireAdmin() {
  const current = await requireUser();

  if (current.session.user.role !== "ADMIN") {
    redirect("/today");
  }

  return current;
}

export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await db.session.updateMany({
      where: {
        tokenHash: hashSessionToken(token),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
