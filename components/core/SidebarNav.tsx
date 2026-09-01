"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Section } from "@/lib/core/sections";

export function SidebarNav({ sections }: { sections: Section[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 px-3">
      {sections.map((section) => {
        const isActive = pathname === section.href || pathname.startsWith(`${section.href}/`);
        return (
          <Link
            key={section.key}
            href={section.href}
            className={`flex items-center gap-2 rounded-lg border-l-2 px-3 py-2 text-sm transition ${
              isActive
                ? "border-violet-500 bg-violet-500/10 text-neutral-50"
                : "border-transparent text-neutral-300 hover:bg-neutral-900 hover:text-neutral-50"
            }`}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
