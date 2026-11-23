import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveAction, restoreAction } from "@/app/actions";
import { StatusSelect } from "@/components/StatusSelect";
import { StatusBadge, TypeBadge } from "@/components/StatusBadge";
import { COST_LABELS, type CostKind } from "@/lib/constants";
import { formatMoney, formatTotals, lineTotal } from "@/lib/money";
import { getHistory, getShipment } from "@/lib/shipments";

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-sm">{value || <span className="text-zinc-400">—</span>}</dd>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps<"/shipments/[id]">) {
  const { id } = await params;
  const s = getShipment(Number(id));
  return { title: s ? `${s.ref} · Aspi Rash` : "Not found · Aspi Rash" };
}

export default async function ShipmentPage({ params }: PageProps<"/shipments/[id]">) {
  const { id } = await params;
  const s = getShipment(Number(id));
  if (!s) notFound();
  const history = getHistory(s.id);

  return (
    <div className="space-y-4">
      {s.archived_at && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span>This shipment is in the archive (archived {when(s.archived_at)}).</span>
          <form action={restoreAction}>
            <input type="hidden" name="id" value={s.id} />
            <button className="btn">Restore</button>
          </form>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={s.archived_at ? "/archive" : "/shipments"} className="text-sm text-blue-700 hover:underline">
            ← {s.archived_at ? "Archive" : "Shipments"}
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold">
            {s.ref} <TypeBadge type={s.type} />
          </h1>
          <p className="text-sm text-zinc-600">{s.party || "No supplier/customer set"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {s.archived_at ? <StatusBadge status={s.status} /> : <StatusSelect id={s.id} status={s.status} />}
          <Link href={`/shipments/${s.id}/edit`} className="btn">
            Edit
          </Link>
          {!s.archived_at && (
            <form action={archiveAction}>
              <input type="hidden" name="id" value={s.id} />
              <button className="btn btn-danger" title="Moves it to the archive. You can restore it later.">
                Archive
              </button>
            </form>
          )}
        </div>
      </div>

      <section className="card grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Origin" value={s.origin} />
        <Info label="Destination" value={s.destination} />
        <Info label="Incoterm" value={s.incoterm} />
        <Info label="Shipping line / forwarder" value={s.carrier} />
        <Info label="Container no." value={s.container_no} />
        <Info label="Bill of lading no." value={s.bl_no} />
        <Info label="Tracking no." value={s.tracking_no} />
        <div />
        <Info label="Order date" value={s.order_date} />
        <Info label="Expected arrival" value={s.expected_date} />
      </section>

      <section className="card overflow-x-auto">
        <h2 className="px-4 pt-3 font-semibold">Products</h2>
        {s.items.length === 0 ? (
          <p className="px-4 py-3 text-sm text-zinc-500">No products yet.</p>
        ) : (
          <table className="mt-2 w-full min-w-[560px] text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-600 uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 text-right font-medium">Quantity</th>
                <th className="px-4 py-2 text-right font-medium">Unit price</th>
                <th className="px-4 py-2 text-right font-medium">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 tabular-nums">
              {s.items.map((it, i) => (
                <tr key={i}>
                  <td className="px-4 py-2">{it.product}</td>
                  <td className="px-4 py-2 text-right">
                    {it.quantity.toLocaleString("en-US")} {it.unit}
                  </td>
                  <td className="px-4 py-2 text-right">{formatMoney(it.unit_price_minor, it.currency)}</td>
                  <td className="px-4 py-2 text-right">
                    {formatMoney(lineTotal(it.quantity, it.unit_price_minor), it.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Costs</h2>
        {s.costs.length === 0 ? (
          <p className="text-sm text-zinc-500">No costs yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 text-sm">
            {s.costs.map((c, i) => (
              <li key={i} className="flex justify-between gap-4 py-1.5">
                <span>
                  {COST_LABELS[c.kind as CostKind] ?? c.kind}
                  {c.note && <span className="text-zinc-500"> — {c.note}</span>}
                </span>
                <span className="tabular-nums">{formatMoney(c.amount_minor, c.currency)}</span>
              </li>
            ))}
          </ul>
        )}
        <dl className="mt-3 grid gap-2 border-t border-zinc-200 pt-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-zinc-500">Goods value</dt>
            <dd className="tabular-nums">{formatTotals(s.goods).join(" + ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Costs</dt>
            <dd className="tabular-nums">{formatTotals(s.costTotals).join(" + ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Total</dt>
            <dd className="text-base font-semibold tabular-nums">{formatTotals(s.total).join(" + ") || "—"}</dd>
          </div>
        </dl>
      </section>

      {s.notes && (
        <section className="card p-4">
          <h2 className="mb-1 font-semibold">Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{s.notes}</p>
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-2 font-semibold">History</h2>
        <ol className="space-y-3 text-sm">
          {history.map((h) => (
            <li key={h.id} className="border-l-2 border-zinc-200 pl-3">
              <div className="font-medium">
                {h.action} <span className="font-normal text-zinc-500">· {when(h.at)} · {h.by}</span>
              </div>
              {h.details && <div className="whitespace-pre-wrap text-zinc-600">{h.details}</div>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
