"use client";

import { primaryButtonClass } from "@/components/ui/Field";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={`${primaryButtonClass} print:hidden`}>
      Print / Save as PDF
    </button>
  );
}
