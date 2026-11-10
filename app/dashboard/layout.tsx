import { sections } from "@/lib/core/sections";
import { logout } from "@/app/login/actions";
import { SidebarNav } from "@/components/core/SidebarNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-neutral-950 text-neutral-50 md:flex-row">
      {/* Phones get a scrollable top bar instead of the sidebar. */}
      <div className="border-b border-neutral-800 md:hidden">
        <SidebarNav sections={sections} orientation="horizontal" />
      </div>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-800 md:flex">
        <div className="px-5 py-5 text-lg font-semibold">Dashboard</div>
        <SidebarNav sections={sections} />
        <form action={logout} className="p-3">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-400 transition hover:bg-neutral-900 hover:text-neutral-50"
          >
            Sign out
          </button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
