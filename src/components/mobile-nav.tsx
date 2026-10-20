import Link from "next/link";

const items = [
  { href: "/today", label: "今天", icon: "✓" },
  { href: "/plans", label: "计划", icon: "◫" },
  { href: "/goals", label: "目标", icon: "◎" },
  { href: "/history", label: "历史", icon: "◷" },
  { href: "/me", label: "我的", icon: "○" },
];

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-2xl border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <ul className="grid grid-cols-5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-medium text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
              href={item.href}
            >
              <span aria-hidden className="text-lg leading-none">
                {item.icon}
              </span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
