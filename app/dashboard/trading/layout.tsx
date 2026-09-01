import { TradingBackLink } from "@/components/trading/TradingBackLink";

export default function TradingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <TradingBackLink />
      {children}
    </div>
  );
}
