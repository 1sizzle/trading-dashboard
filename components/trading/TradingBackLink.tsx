"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TradingBackLink() {
  const pathname = usePathname();

  if (pathname === "/dashboard/trading") {
    return null;
  }

  return (
    <Link
      href="/dashboard/trading"
      className="inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-violet-400"
    >
      ← Back to Trading
    </Link>
  );
}
