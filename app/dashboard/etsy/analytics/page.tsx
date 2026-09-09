import { db } from "@/lib/core/db";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { Field, inputClass, primaryButtonClass } from "@/components/ui/Field";
import { addAnalyticsRecord } from "./actions";

export const dynamic = "force-dynamic";

export default async function EtsyAnalyticsPage() {
  const [records, products] = await Promise.all([
    db.etsyAnalyticsRecord.findMany({
      orderBy: { date: "desc" },
      include: { product: true },
      take: 50,
    }),
    db.etsyProduct.findMany({ orderBy: { sku: "asc" } }),
  ]);

  const totals = records.reduce(
    (acc, r) => ({
      views: acc.views + r.views,
      favourites: acc.favourites + r.favourites,
      orders: acc.orders + r.orders,
      revenue: acc.revenue + Number(r.revenue),
    }),
    { views: 0, favourites: 0, orders: 0, revenue: 0 }
  );
  const conversion = totals.views > 0 ? ((totals.orders / totals.views) * 100).toFixed(1) : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="mt-1 text-neutral-400">
          Views, favourites, orders, and revenue. Manually logged for now — synced Etsy data is a later stage.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatTile label="Views" value={String(totals.views)} />
        <StatTile label="Favourites" value={String(totals.favourites)} />
        <StatTile label="Orders" value={String(totals.orders)} />
        <StatTile label="Revenue" value={totals.revenue.toFixed(2)} />
        <StatTile label="Conversion" value={conversion === "—" ? conversion : `${conversion}%`} />
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Log a data point</h2>
        <form action={addAnalyticsRecord} className="grid grid-cols-3 gap-4">
          <Field label="Product" hint="Optional">
            <select name="productId" defaultValue="" className={inputClass}>
              <option value="">Unmatched / general</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" name="date" required className={inputClass} />
          </Field>
          <Field label="Views">
            <input type="number" name="views" defaultValue={0} className={inputClass} />
          </Field>
          <Field label="Favourites">
            <input type="number" name="favourites" defaultValue={0} className={inputClass} />
          </Field>
          <Field label="Orders">
            <input type="number" name="orders" defaultValue={0} className={inputClass} />
          </Field>
          <Field label="Revenue">
            <input type="number" name="revenue" step="any" defaultValue={0} className={inputClass} />
          </Field>
          <div className="col-span-3 flex justify-end">
            <button type="submit" className={primaryButtonClass}>
              Add
            </button>
          </div>
        </form>
      </Card>

      {records.length === 0 ? (
        <p className="text-sm text-neutral-500">No analytics logged yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-neutral-400">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Views</th>
                <th className="px-4 py-2 font-medium">Favourites</th>
                <th className="px-4 py-2 font-medium">Orders</th>
                <th className="px-4 py-2 font-medium">Revenue</th>
                <th className="px-4 py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-neutral-900 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-neutral-300">
                    {record.date.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-2 text-neutral-300">
                    {record.product ? `${record.product.sku} — ${record.product.title}` : "Unmatched"}
                  </td>
                  <td className="px-4 py-2 text-neutral-300">{record.views}</td>
                  <td className="px-4 py-2 text-neutral-300">{record.favourites}</td>
                  <td className="px-4 py-2 text-neutral-300">{record.orders}</td>
                  <td className="px-4 py-2 text-neutral-300">{Number(record.revenue).toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${
                        record.source === "MANUAL"
                          ? "border-neutral-700 bg-neutral-800 text-neutral-400"
                          : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                      }`}
                    >
                      {record.source === "MANUAL" ? "Manual" : "Synced"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
