import { Card } from "@/components/ui/Card";

export default function DashboardHomePage() {
  return (
    <Card accent className="max-w-md">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-neutral-400">Pick a section from the sidebar to get started.</p>
    </Card>
  );
}
