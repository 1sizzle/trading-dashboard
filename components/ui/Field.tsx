export const inputClass =
  "w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";

export const primaryButtonClass =
  "rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500";

export const secondaryButtonClass =
  "rounded-lg border border-neutral-800 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-900";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-neutral-300">{label}</span>
      {children}
      {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}
