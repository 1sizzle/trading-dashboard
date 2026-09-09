import { EtsyTabNav } from "@/components/etsy/EtsyTabNav";

export default function EtsyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <EtsyTabNav />
      {children}
    </div>
  );
}
