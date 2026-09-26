"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { label: string; href: string; match?: (pathname: string) => boolean; divider?: boolean };

const BASE = "/dashboard/trading";

const TABS: Tab[] = [
  {
    label: "Market Update",
    href: BASE,
    match: (p) => p === BASE || p.startsWith(`${BASE}/market-breakdown`),
  },
  {
    label: "Journal",
    href: `${BASE}/journal`,
    match: (p) => p.startsWith(`${BASE}/journal`) && !p.startsWith(`${BASE}/journal/new`),
  },
  { label: "Add Trade", href: `${BASE}/journal/new`, match: (p) => p.startsWith(`${BASE}/journal/new`) },
  { label: "Analytics", href: `${BASE}/analytics` },
  { label: "PnL Calendar", href: `${BASE}/pnl-calendar` },
  { label: "Market Bias", href: `${BASE}/market-bias` },
  { label: "News", href: `${BASE}/news` },
  { label: "Accounts", href: `${BASE}/accounts` },
  { label: "Budgeting & Tax", href: `${BASE}/budgeting-tax` },
  { label: "EV Calculator", href: `${BASE}/ev-calculator`, divider: true },
];

export function TradingNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto md:w-48 md:shrink-0 md:flex-col md:overflow-visible">
      {TABS.map((tab) => {
        const isActive = tab.match ? tab.match(pathname) : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`whitespace-nowrap rounded-lg border-l-2 px-3 py-2 text-sm transition ${tab.divider ? "md:mt-3 md:border-t md:border-t-neutral-800 md:pt-4" : ""} ${
              isActive
                ? "border-violet-500 bg-violet-500/10 text-neutral-50"
                : "border-transparent text-neutral-400 hover:bg-neutral-900 hover:text-neutral-50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
