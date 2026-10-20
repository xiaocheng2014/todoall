import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";

export default async function HomePage() {
  const current = await getCurrentSession();

  if (!current) {
    redirect("/login");
  }

  redirect(
    current.session.user.mustChangePassword ? "/change-password" : "/today",
  );
}
