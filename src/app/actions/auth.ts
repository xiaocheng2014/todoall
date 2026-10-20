"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/password";
import {
  createSession,
  requireUser,
  revokeCurrentSession,
} from "@/lib/session";

export type AuthActionState = {
  error: string | null;
};

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 5;

async function loginSourceHash(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const source = forwarded || requestHeaders.get("x-real-ip") || "unknown";
  return createHash("sha256").update(source).digest("hex");
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const loginName = String(formData.get("loginName") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!loginName || !password) {
    return { error: "请输入登录账号和密码" };
  }

  const loginNameNormalized = loginName.toLocaleLowerCase("zh-CN");
  const sourceHash = await loginSourceHash();
  const windowStart = new Date(Date.now() - LOGIN_WINDOW_MS);
  const recentFailures = await db.loginAttempt.count({
    where: {
      loginNameNormalized,
      sourceHash,
      attemptedAt: { gte: windowStart },
    },
  });

  if (recentFailures >= MAX_LOGIN_FAILURES) {
    return { error: "登录尝试次数过多，请 15 分钟后再试" };
  }

  const user = await db.user.findUnique({
    where: { loginNameNormalized },
  });

  const authenticated =
    user &&
    user.status === "ACTIVE" &&
    (await verifyPassword(password, user.passwordHash));

  if (!authenticated || !user) {
    await db.loginAttempt.create({
      data: { loginNameNormalized, sourceHash },
    });
    return { error: "账号或密码不正确" };
  }

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    db.loginAttempt.deleteMany({
      where: { loginNameNormalized, sourceHash },
    }),
  ]);
  await createSession(user.id);

  redirect(user.mustChangePassword ? "/change-password" : "/today");
}

export async function changePasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const current = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return { error: passwordError };
  }

  if (newPassword !== confirmPassword) {
    return { error: "两次输入的新密码不一致" };
  }

  if (currentPassword === newPassword) {
    return { error: "新密码不能与当前密码相同" };
  }

  const user = await db.user.findUnique({
    where: { id: current.session.user.id },
  });

  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return { error: "当前密码不正确" };
  }

  const passwordHash = await hashPassword(newPassword);

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    }),
    db.session.updateMany({
      where: {
        userId: user.id,
        tokenHash: { not: current.tokenHash },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    }),
  ]);

  redirect("/today");
}

export async function logoutAction(): Promise<void> {
  await revokeCurrentSession();
  redirect("/login");
}
