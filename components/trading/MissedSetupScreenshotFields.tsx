import { Field } from "@/components/ui/Field";
import type { MissedSetup, MissedSetupScreenshot } from "@/lib/generated/prisma/client";

type MissedSetupWithScreenshots = MissedSetup & { screenshots: MissedSetupScreenshot[] };

export function MissedSetupScreenshotFields({ missedSetup }: { missedSetup?: MissedSetupWithScreenshots }) {
  return (
    <div className="col-span-2 space-y-3">
      <Field label="Chart screenshots" hint="TradingView screenshots — PNG/JPG, up to 8MB each">
        <input
          type="file"
          name="screenshots"
          accept="image/*"
          multiple
          className="text-sm text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:text-neutral-50 hover:file:bg-neutral-700"
        />
      </Field>

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
