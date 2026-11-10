"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Section } from "@/lib/core/sections";

export function SidebarNav({
  sections,
  orientation = "vertical",
}: {
  sections: Section[];
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();

  if (orientation === "horizontal") {
    return (
      <nav className="flex gap-1 overflow-x-auto px-3 py-2">
        {sections.map((section) => {
          const isActive = pathname === section.href || pathname.startsWith(`${section.href}/`);
          return (
            <Link
              key={section.key}
              href={section.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                isActive ? "bg-violet-500/15 text-neutral-50" : "text-neutral-400 hover:text-neutral-50"
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
