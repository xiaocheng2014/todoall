import { redirect } from "next/navigation";
import { MobileNav } from "@/components/mobile-nav";
import { requireUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await requireUser();

  if (current.session.user.mustChangePassword) {
    redirect("/change-password");
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl pb-24">
      {children}
      <MobileNav />
    </div>
  );
}
