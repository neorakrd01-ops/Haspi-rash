import { STATUS_LABELS, STATUS_STYLES, type Status } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const s = status as Status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[s] ?? ""}`}
    >
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const imp = type === "import";
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-xs font-semibold ${imp ? "bg-indigo-50 text-indigo-700" : "bg-teal-50 text-teal-700"}`}
    >
      {imp ? "Import" : "Export"}
    </span>
  );
}
