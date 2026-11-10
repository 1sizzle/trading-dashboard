"use client";

import { useState } from "react";
import { primaryButtonClass } from "@/components/ui/Field";

export function CopyScriptButton({ script }: { script: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={copy} className={primaryButtonClass}>
      {copied ? "Copied ✓" : "Copy widget script"}
    </button>
  );
}
