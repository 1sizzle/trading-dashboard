import Link from "next/link";
import { deleteMissedSetup } from "@/app/dashboard/trading/journal/actions";
import { formatNewYorkDateTime } from "@/lib/trading/calc";
import type { MissedSetup } from "@/lib/generated/prisma/client";

export function MissedSetupTable({ missedSetups }: { missedSetups: MissedSetup[] }) {
  if (missedSetups.length === 0) {
    return <p className="text-sm text-neutral-500">No missed setups logged yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-neutral-400">
            <th className="px-4 py-2 font-medium">Seen at</th>
            <th className="px-4 py-2 font-medium">Symbol</th>
            <th className="px-4 py-2 font-medium">Dir</th>
            <th className="px-4 py-2 font-medium">Setup</th>
            <th className="px-4 py-2 font-medium">Reason skipped</th>
            <th className="px-4 py-2 font-medium">Notes</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {missedSetups.map((missedSetup) => (
            <tr key={missedSetup.id} className="border-b border-neutral-900 last:border-0">
              <td className="whitespace-nowrap px-4 py-2 text-neutral-300">
                {formatNewYorkDateTime(missedSetup.seenAt)}
              </td>
              <td className="px-4 py-2 font-medium">{missedSetup.symbol}</td>
              <td className="px-4 py-2 text-neutral-300">
                {missedSetup.direction === "LONG" ? "Long" : "Short"}
              </td>
              <td className="px-4 py-2 text-neutral-300">{missedSetup.setupDescription}</td>
              <td className="px-4 py-2 text-neutral-300">{missedSetup.reasonSkipped}</td>
              <td className="px-4 py-2 text-neutral-400">{missedSetup.notes ?? "—"}</td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/trading/journal/missed/${missedSetup.id}/edit`}
                    className="text-neutral-400 hover:text-neutral-50"
                  >
                    Edit
                  </Link>
                  <form action={deleteMissedSetup}>
                    <input type="hidden" name="id" value={missedSetup.id} />
                    <button type="submit" className="text-neutral-400 hover:text-red-400">
                      Delete
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
