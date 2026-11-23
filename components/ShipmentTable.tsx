import Link from "next/link";
import { formatTotals } from "@/lib/money";
import type { ShipmentRow } from "@/lib/shipments";
import { StatusBadge, TypeBadge } from "./StatusBadge";
import { StatusSelect } from "./StatusSelect";

export function ShipmentTable({ rows, archived = false }: { rows: ShipmentRow[]; archived?: boolean }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-600 uppercase">
          <tr>
            <th className="px-3 py-2 font-medium">Reference</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Supplier / customer</th>
            <th className="px-3 py-2 font-medium">Route</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Order date</th>
            <th className="px-3 py-2 font-medium">Expected</th>
            <th className="px-3 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((s) => {
            const totals = formatTotals(s.total);
            return (
              <tr key={s.id} className="hover:bg-zinc-50">
                <td className="px-3 py-2">
                  <Link href={`/shipments/${s.id}`} className="font-medium text-blue-700 hover:underline">
                    {s.ref}
                  </Link>
                  <div className="text-xs text-zinc-500">
                    {s.itemCount} product{s.itemCount === 1 ? "" : "s"}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <TypeBadge type={s.type} />
                </td>
                <td className="px-3 py-2">{s.party || <span className="text-zinc-400">—</span>}</td>
                <td className="px-3 py-2 text-zinc-600">
                  {s.origin || s.destination ? `${s.origin || "?"} → ${s.destination || "?"}` : "—"}
                </td>
                <td className="px-3 py-2">
                  {archived ? <StatusBadge status={s.status} /> : <StatusSelect id={s.id} status={s.status} />}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-zinc-600">{s.order_date ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap text-zinc-600">{s.expected_date ?? "—"}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                  {totals.length ? totals.map((t) => <div key={t}>{t}</div>) : <span className="text-zinc-400">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
