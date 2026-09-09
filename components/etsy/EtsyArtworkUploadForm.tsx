import { Card } from "@/components/ui/Card";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { uploadArtwork } from "@/app/dashboard/etsy/upload/actions";

export function EtsyArtworkUploadForm({ productId }: { productId: string }) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Upload artwork</h2>
      <form action={uploadArtwork} className="grid grid-cols-3 gap-4">
        <input type="hidden" name="productId" value={productId} />

        <Field label="Role">
          <select name="role" defaultValue="ORIGINAL" className={inputClass}>
            <option value="ORIGINAL">Original artwork</option>
            <option value="MOCKUP">Mockup</option>
            <option value="SIZE_GUIDE">Size guide</option>
          </select>
        </Field>

        <div className="col-span-2">
          <Field label="Files" hint="Image files only, up to 25MB each">
            <input
              type="file"
              name="files"
              accept="image/*"
              multiple
              className="text-sm text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:text-neutral-50 hover:file:bg-neutral-700"
            />
          </Field>
        </div>

        <div className="col-span-3 flex justify-end">
          <button type="submit" className={primaryButtonClass}>
            Upload
          </button>
        </div>
      </form>
    </Card>
  );
}
