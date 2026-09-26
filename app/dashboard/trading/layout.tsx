import { TradingNav } from "@/components/trading/TradingNav";

export default function TradingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <TradingNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
