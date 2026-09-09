import { deleteArtwork, setPrimaryArtwork } from "@/app/dashboard/etsy/upload/actions";
import type { EtsyArtworkAsset, EtsyArtworkRole } from "@/lib/generated/prisma/client";

const ROLE_LABELS: Record<EtsyArtworkRole, string> = {
  ORIGINAL: "Original artwork",
  MOCKUP: "Mockups",
  SIZE_GUIDE: "Size guide",
};

export function EtsyArtworkGrid({ productId, assets }: { productId: string; assets: EtsyArtworkAsset[] }) {
  const roles: EtsyArtworkRole[] = ["ORIGINAL", "MOCKUP", "SIZE_GUIDE"];

  return (
    <div className="space-y-6">
      {roles.map((role) => {
        const roleAssets = assets.filter((a) => a.role === role);
        if (roleAssets.length === 0) return null;

        return (
          <div key={role}>
            <h3 className="mb-2 text-sm font-medium text-neutral-300">{ROLE_LABELS[role]}</h3>
            <div className="grid grid-cols-4 gap-3">
              {roleAssets.map((asset) => (
                <div key={asset.id} className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/screenshots/etsy/${asset.id}`}
                    alt=""
                    className={`aspect-video w-full rounded-lg border object-cover ${
                      asset.isPrimary ? "border-violet-500" : "border-neutral-800"
                    }`}
                  />
                  <div className="flex items-center justify-between text-xs">
                    {asset.isPrimary ? (
                      <span className="text-violet-400">Primary</span>
                    ) : (
                      <form action={setPrimaryArtwork}>
                        <input type="hidden" name="id" value={asset.id} />
                        <input type="hidden" name="productId" value={productId} />
                        <button type="submit" className="text-neutral-500 hover:text-neutral-300">
                          Set primary
                        </button>
                      </form>
                    )}
                    <form action={deleteArtwork}>
                      <input type="hidden" name="id" value={asset.id} />
                      <input type="hidden" name="productId" value={productId} />
                      <button type="submit" className="text-neutral-500 hover:text-red-400">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
