import Link from "next/link";
import { sections } from "@/lib/core/sections";
import { logout } from "@/app/login/actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 bg-neutral-950 text-neutral-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-800">
        <div className="px-5 py-5 text-lg font-semibold">Dashboard</div>
        <nav className="flex-1 space-y-1 px-3">
          {sections.map((section) => (
            <Link
              key={section.key}
              href={section.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-900 hover:text-neutral-50"
            >
              <span>{section.icon}</span>
              <span>{section.label}</span>
            </Link>
          ))}
        </nav>
        <form action={logout} className="p-3">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-400 transition hover:bg-neutral-900 hover:text-neutral-50"
          >
            Sign out
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
