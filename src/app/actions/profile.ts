"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type ProfileActionState = {
  error: string | null;
  success: string | null;
};

export async function updateProfileAction(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const current = await requireUser();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();

  if (!displayName || displayName.length > 50) {
    return { error: "用户名不能为空且不能超过 50 个字符", success: null };
  }

  try {
    new Intl.DateTimeFormat("zh-CN", { timeZone: timezone }).format();
  } catch {
    return { error: "时区格式无效", success: null };
  }

  await db.user.update({
    where: { id: current.session.user.id },
    data: { displayName, timezone },
  });

  revalidatePath("/me");
  revalidatePath("/today");
  return { error: null, success: "个人设置已保存" };
}
