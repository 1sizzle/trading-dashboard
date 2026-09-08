"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Field } from "@/components/ui/Field";
import type { MissedSetup, MissedSetupScreenshot } from "@/lib/generated/prisma/client";

type MissedSetupWithScreenshots = MissedSetup & { screenshots: MissedSetupScreenshot[] };

export function MissedSetupScreenshotFields({ missedSetup }: { missedSetup?: MissedSetupWithScreenshots }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  function syncInputFiles(files: File[]) {
    const dt = new DataTransfer();
    files.forEach((file) => dt.items.add(file));
    if (fileInputRef.current) fileInputRef.current.files = dt.files;
  }

  function removePending(index: number) {
    setPendingFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      syncInputFiles(next);
      return next;
    });
  }

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      // Multiple screenshot fields can exist on one page (e.g. the trade form and the
      // potential-setup form both on the Futures & Metals journal tab). Only claim the
      // paste for this field if focus is currently inside this field's own <form> —
      // otherwise every mounted screenshot field would grab the same pasted image.
      const form = fileInputRef.current?.form;
      if (!form || !document.activeElement || !form.contains(document.activeElement)) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const images: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const ext = item.type.split("/")[1] || "png";
            images.push(new File([file], `pasted-screenshot-${Date.now()}.${ext}`, { type: item.type }));
          }
        }
      }

      if (images.length > 0) {
        e.preventDefault();
        setPendingFiles((prev) => {
          const next = [...prev, ...images];
          syncInputFiles(next);
          return next;
        });
      }
    }

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const previewUrls = useMemo(() => pendingFiles.map((file) => URL.createObjectURL(file)), [pendingFiles]);

  useEffect(() => {
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [previewUrls]);

  return (
    <div className="col-span-2 space-y-3">
      <Field label="Chart screenshots" hint="TradingView screenshots — PNG/JPG, up to 8MB each. Or just paste (Ctrl+V) a copied chart screenshot anywhere on this page.">
        <input
          ref={fileInputRef}
          type="file"
          name="screenshots"
          accept="image/*"
          multiple
          onChange={(e) => setPendingFiles(Array.from(e.target.files ?? []))}
          className="text-sm text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:text-neutral-50 hover:file:bg-neutral-700"
        />
      </Field>

      {pendingFiles.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {pendingFiles.map((file, index) => (
            <div key={index} className="relative space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrls[index]}
                alt=""
                className="aspect-video w-full rounded-lg border border-violet-500/40 object-cover"
              />
              <button
                type="button"
                onClick={() => removePending(index)}
                className="absolute right-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-xs text-neutral-50 hover:bg-black/90"
              >
                ×
              </button>
              <p className="text-xs text-violet-300">Pending upload</p>
            </div>
          ))}
        </div>
      )}

      {missedSetup && missedSetup.screenshots.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {missedSetup.screenshots.map((screenshot) => (
            <div key={screenshot.id} className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/screenshots/missed/${screenshot.id}`}
                alt=""
                className="aspect-video w-full rounded-lg border border-neutral-800 object-cover"
              />
              <label className="flex items-center gap-1.5 text-xs text-neutral-400">
                <input
                  type="checkbox"
                  name="deleteScreenshotIds"
                  value={screenshot.id}
                  className="accent-red-500"
                />
                Delete
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
