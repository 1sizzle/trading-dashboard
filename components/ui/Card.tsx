export function Card({
  children,
  className = "",
  accent = false,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 ${
        accent ? "border-t-2 border-t-violet-500" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
