import { notFound } from "next/navigation";
import { db } from "@/lib/core/db";
import { EditSubscriptionForm } from "@/components/finances/EditSubscriptionForm";
import { updateSubscription } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EditSubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subscription = await db.subscription.findUnique({ where: { id } });
  if (!subscription) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit subscription</h1>
      <EditSubscriptionForm
        id={subscription.id}
        name={subscription.name}
        amount={Number(subscription.amount)}
        cycle={subscription.cycle}
        type={subscription.type}
        category={subscription.category}
        note={subscription.note}
        nextBillingDate={subscription.nextBillingDate}
        action={updateSubscription}
      />
    </div>
  );
}
