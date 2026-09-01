export function StatTile({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <p className="text-sm text-neutral-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold text-neutral-50 ${valueClassName}`}>{value}</p>
    </div>
  );
}
