import Link from "next/link";
import { STATUSES, STATUS_LABELS } from "@/lib/constants";
import { listShipments } from "@/lib/shipments";
import { ShipmentTable } from "@/components/ShipmentTable";

export const metadata = { title: "Shipments · Aspi Rash" };

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : (v ?? "");
}

export default async function ShipmentsPage({ searchParams }: PageProps<"/shipments">) {
  const sp = await searchParams;
  const q = one(sp.q);
  const type = one(sp.type);
  const status = one(sp.status);
  const sort = one(sp.sort) || "order_desc";
  const rows = listShipments({ q, type, status, sort });
  const filtered = Boolean(q || type || status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Shipments</h1>
        <Link href="/shipments/new" className="btn btn-primary">
          + New shipment
        </Link>
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-3" role="search">
        <div className="min-w-[220px] flex-1">
          <label className="label" htmlFor="q">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Reference, party, product, container, B/L, tracking…"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="type">
            Type
          </label>
          <select id="type" name="type" defaultValue={type} className="field">
            <option value="">All</option>
            <option value="import">Imports</option>
            <option value="export">Exports</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="field">
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sort">
            Sort by
          </label>
          <select id="sort" name="sort" defaultValue={sort} className="field">
            <option value="order_desc">Order date (newest first)</option>
            <option value="order_asc">Order date (oldest first)</option>
            <option value="expected_asc">Expected arrival (soonest first)</option>
            <option value="expected_desc">Expected arrival (latest first)</option>
            <option value="updated_desc">Recently changed</option>
          </select>
        </div>
        <button className="btn btn-primary" type="submit">
          Apply
        </button>
        {filtered && (
          <Link href="/shipments" className="btn">
            Clear
          </Link>
        )}
      </form>

      <p className="text-sm text-zinc-600">
        {rows.length} shipment{rows.length === 1 ? "" : "s"}
        {filtered ? " match" : ""}
      </p>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-zinc-600">
          {filtered ? (
            "No shipments match these filters."
          ) : (
            <>
              No shipments yet.{" "}
              <Link href="/shipments/new" className="font-medium text-blue-700 underline">
                Add your first shipment
              </Link>
              .
            </>
          )}
        </div>
      ) : (
        <ShipmentTable rows={rows} />
      )}
    </div>
  );
}
