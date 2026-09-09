"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  label: string;
  href?: string; // omitted = not built yet, shown disabled
};

const TABS: Tab[] = [
  { label: "Overview", href: "/dashboard/etsy" },
  { label: "Products", href: "/dashboard/etsy/products" },
  { label: "Prompt Studio", href: "/dashboard/etsy/prompt-studio" },
  { label: "Upload", href: "/dashboard/etsy/upload" },
  { label: "Listings", href: "/dashboard/etsy/listings" },
  { label: "Keywords", href: "/dashboard/etsy/keywords" },
  { label: "Bundles", href: "/dashboard/etsy/bundles" },
  { label: "Analytics", href: "/dashboard/etsy/analytics" },
  { label: "Opportunities", href: "/dashboard/etsy/opportunities" },
  { label: "Tasks" },
  { label: "Settings", href: "/dashboard/etsy/settings" },
];

export function EtsyTabNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-1 border-b border-neutral-800">
      {TABS.map((tab) => {
        if (!tab.href) {
          return (
            <span
              key={tab.label}
              title="Coming in a later stage"
              className="cursor-not-allowed px-3 py-2 text-sm text-neutral-600"
            >
              {tab.label}
            </span>
          );
        }

        const isActive =
          tab.href === "/dashboard/etsy"
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`px-3 py-2 text-sm font-medium ${
              isActive
                ? "border-b-2 border-violet-500 text-neutral-50"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
