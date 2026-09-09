"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del, put } from "@vercel/blob";
import { db } from "@/lib/core/db";
import type { EtsyArtworkRole } from "@/lib/generated/prisma/client";

const MAX_ARTWORK_BYTES = 25 * 1024 * 1024; // print masters run larger than a chart screenshot
const VALID_ROLES: EtsyArtworkRole[] = ["ORIGINAL", "MOCKUP", "SIZE_GUIDE"];

export async function uploadArtwork(formData: FormData) {
  const productId = String(formData.get("productId"));
  const roleRaw = String(formData.get("role") ?? "");
  if (!VALID_ROLES.includes(roleRaw as EtsyArtworkRole)) {
    throw new Error("Invalid artwork role");
  }
  const role = roleRaw as EtsyArtworkRole;

  const product = await db.etsyProduct.findUniqueOrThrow({ where: { id: productId } });

  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const existingCount = await db.etsyArtworkAsset.count({ where: { productId } });

  let order = existingCount;
  for (const file of files) {
    if (!file.type.startsWith("image/") || file.size > MAX_ARTWORK_BYTES) {
      continue; // skipped — wrong type or too large
    }
    const blob = await put(`etsy-artwork/${product.sku}/${role.toLowerCase()}/${crypto.randomUUID()}-${file.name}`, file, {
      access: "private",
    });
    const isFirstOfRole = !(await db.etsyArtworkAsset.findFirst({ where: { productId, role } }));
    await db.etsyArtworkAsset.create({
      data: {
        productId,
        sku: product.sku,
        role,
        url: blob.url,
        order: order++,
        isPrimary: isFirstOfRole,
        fileSize: file.size,
        mimeType: file.type,
      },
    });
  }

  revalidatePath(`/dashboard/etsy/upload`);
  redirect(`/dashboard/etsy/upload?product=${productId}`);
}

export async function deleteArtwork(formData: FormData) {
  const id = String(formData.get("id"));
  const productId = String(formData.get("productId"));

  const asset = await db.etsyArtworkAsset.findUnique({ where: { id } });
  if (asset) {
    await db.etsyArtworkAsset.delete({ where: { id } });
    await del(asset.url).catch(() => {});
  }

  revalidatePath(`/dashboard/etsy/upload`);
  redirect(`/dashboard/etsy/upload?product=${productId}`);
}

export async function setPrimaryArtwork(formData: FormData) {
  const id = String(formData.get("id"));
  const productId = String(formData.get("productId"));

  const asset = await db.etsyArtworkAsset.findUniqueOrThrow({ where: { id } });
  await db.$transaction([
    db.etsyArtworkAsset.updateMany({
      where: { productId, role: asset.role },
      data: { isPrimary: false },
    }),
    db.etsyArtworkAsset.update({ where: { id }, data: { isPrimary: true } }),
  ]);

  revalidatePath(`/dashboard/etsy/upload`);
  redirect(`/dashboard/etsy/upload?product=${productId}`);
}
