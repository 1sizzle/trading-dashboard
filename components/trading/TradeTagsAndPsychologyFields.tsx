import { Field, inputClass } from "@/components/ui/Field";
import type {
  PsychologyEntry,
  Tag,
  Trade,
  TradeScreenshot,
  TradeTag,
} from "@/lib/generated/prisma/client";

export type TradeWithExtras = Trade & {
  tags: (TradeTag & { tag: Tag })[];
  psychology: PsychologyEntry | null;
  screenshots: TradeScreenshot[];
};

const EMOTION_SUGGESTIONS = [
  "Calm",
  "Confident",
  "Anxious",
  "FOMO",
  "Tilted",
  "Revenge-trading",
  "Bored",
  "Impatient",
  "Frustrated",
  "Excited",
];

export function TradeTagsAndPsychologyFields({
  trade,
  tagSuggestions,
}: {
  trade?: TradeWithExtras;
  tagSuggestions: string[];
}) {
  const currentTags = trade?.tags.map((tt) => tt.tag.name).join(", ") ?? "";

  return (
    <>
      <div className="col-span-2">
        <Field label="Tags" hint="Comma-separated, e.g. followed rules, FOMO entry">
          <input
            type="text"
            name="tags"
            list="tag-suggestions"
            defaultValue={currentTags}
            className={inputClass}
          />
          <datalist id="tag-suggestions">
            {tagSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </Field>
      </div>

      <Field label="Pre-trade emotion" hint="Optional">
        <input
          type="text"
          name="preEmotion"
          list="emotion-suggestions"
          defaultValue={trade?.psychology?.preEmotion ?? ""}
          className={inputClass}
        />
      </Field>

      <Field label="Post-trade emotion" hint="Optional">
        <input
          type="text"
          name="postEmotion"
          list="emotion-suggestions"
          defaultValue={trade?.psychology?.postEmotion ?? ""}
          className={inputClass}
        />
      </Field>
      <datalist id="emotion-suggestions">
        {EMOTION_SUGGESTIONS.map((emotion) => (
          <option key={emotion} value={emotion} />
        ))}
      </datalist>

      <div className="col-span-2">
        <Field label="Psychology notes" hint="Optional">
          <textarea
            name="psychologyNotes"
            rows={2}
            defaultValue={trade?.psychology?.notes ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
    </>
  );
}
