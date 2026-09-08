import { notFound } from "next/navigation";
import { db } from "@/lib/core/db";
import { MissedSetupForm } from "@/components/trading/MissedSetupForm";

export const dynamic = "force-dynamic";

export default async function EditMissedSetupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const missedSetup = await db.missedSetup.findUnique({ where: { id }, include: { screenshots: true } });

  if (!missedSetup) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit potential setup</h1>
      <MissedSetupForm missedSetup={missedSetup} />
    </div>
  );
}
