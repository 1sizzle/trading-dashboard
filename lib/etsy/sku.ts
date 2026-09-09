import { db } from "@/lib/core/db";

/**
 * Allocates the next permanent, sequential SKU using EtsySettings.skuCounter —
 * a monotonic counter, not a MAX(sku) scan, so a deleted product's SKU can
 * never be silently reused. Runs inside a transaction so two concurrent
 * allocations can't hand out the same number.
 */
export async function allocateNextSku(): Promise<string> {
  return db.$transaction(async (tx) => {
    let settings = await tx.etsySettings.findFirst();
    if (!settings) {
      settings = await tx.etsySettings.create({ data: {} });
    }

    const digits = settings.skuDigits;
    const max = 10 ** digits - 1;
    const nextNumber = settings.skuCounter + 1;

    if (nextNumber > max) {
      throw new Error(`SKU space exhausted for ${digits}-digit format (max ${max}) — increase SKU digits in settings`);
    }

    const sku = String(nextNumber).padStart(digits, "0");

    // Defensive check — should never trigger given the monotonic counter,
    // but a manually edited counter or a preserved legacy SKU shouldn't be
    // trusted blindly to skip an existing row.
    const collision = await tx.etsyProduct.findUnique({ where: { sku } });
    if (collision) {
      throw new Error(`SKU ${sku} already exists — EtsySettings.skuCounter is out of sync with real product rows`);
    }

    await tx.etsySettings.update({ where: { id: settings.id }, data: { skuCounter: nextNumber } });
    return sku;
  });
}
