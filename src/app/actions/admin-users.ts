"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, validatePassword } from "@/lib/password";
import { requireAdmin } from "@/lib/session";

export type AdminActionState = {
  error: string | null;
  success: string | null;
};

const emptyState: AdminActionState = { error: null, success: null };

function normalizeLoginName(loginName: string): string {
  return loginName.trim().toLocaleLowerCase("zh-CN");
}

function validateLoginName(loginName: string): string | null {
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(loginName)) {
    return "登录账号需要 3～40 位，只能包含字母、数字、点、横线和下划线";
  }

  return null;
}

export async function createUserAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();
  const loginName = String(formData.get("loginName") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "USER") === "ADMIN" ? "ADMIN" : "USER";

  const loginError = validateLoginName(loginName);
  if (loginError) {
    return { ...emptyState, error: loginError };
  }

  if (!displayName || displayName.length > 50) {
    return { ...emptyState, error: "用户名不能为空且不能超过 50 个字符" };
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { ...emptyState, error: passwordError };
  }

  const loginNameNormalized = normalizeLoginName(loginName);
  const existingUser = await db.user.findUnique({
    where: { loginNameNormalized },
    select: { id: true },
  });

  if (existingUser) {
    return { ...emptyState, error: "这个登录账号已经存在" };
  }

  const passwordHash = await hashPassword(password);

  try {
    await db.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          loginName,
          loginNameNormalized,
          displayName,
          passwordHash,
          role,
          notificationSetting: { create: {} },
        },
      });

      await transaction.auditLog.create({
        data: {
          actorId: admin.session.user.id,
          action: "USER_CREATED",
          targetType: "USER",
          targetId: user.id,
          metadata: JSON.stringify({ loginName, displayName, role }),
        },
      });
    });
  } catch {
    return { ...emptyState, error: "创建用户失败，请确认账号没有被同时创建" };
  }

  revalidatePath("/admin/users");
  return { ...emptyState, success: `账号 ${loginName} 已创建` };
}

export async function resetUserPasswordAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordError = validatePassword(password);

  if (!userId || passwordError) {
    return { ...emptyState, error: passwordError ?? "用户不存在" };
  }

  const targetUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, loginName: true },
  });

  if (!targetUser) {
    return { ...emptyState, error: "用户不存在" };
  }

  const passwordHash = await hashPassword(password);

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: true },
    }),
    db.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    db.auditLog.create({
      data: {
        actorId: admin.session.user.id,
        action: "USER_PASSWORD_RESET",
        targetType: "USER",
        targetId: userId,
        metadata: JSON.stringify({ loginName: targetUser.loginName }),
      },
    }),
  ]);

  revalidatePath("/admin/users");
  return {
    ...emptyState,
    success: `已重置 ${targetUser.loginName} 的密码，原会话已失效`,
  };
}

export async function setUserStatusAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const requestedStatus = String(formData.get("status") ?? "");
  const status = requestedStatus === "DISABLED" ? "DISABLED" : "ACTIVE";

  if (!userId || userId === admin.session.user.id) {
    return;
  }

  const targetUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, loginName: true, status: true },
  });

  if (!targetUser || targetUser.status === status) {
    return;
  }

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { status } }),
    ...(status === "DISABLED"
      ? [
          db.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
          }),
        ]
      : []),
    db.auditLog.create({
      data: {
        actorId: admin.session.user.id,
        action: status === "ACTIVE" ? "USER_ENABLED" : "USER_DISABLED",
        targetType: "USER",
        targetId: userId,
        metadata: JSON.stringify({ loginName: targetUser.loginName }),
      },
    }),
  ]);

  revalidatePath("/admin/users");
}
