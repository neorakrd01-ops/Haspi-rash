import { listShipments } from "@/lib/shipments";
import { ShipmentTable } from "@/components/ShipmentTable";

export const metadata = { title: "Archive · Aspi Rash" };

export default function ArchivePage() {
  const rows = listShipments({ archived: true, sort: "updated_desc" });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Archive</h1>
        <p className="text-sm text-zinc-600">
          Archived shipments are kept safely here and can be restored at any time. Open one and click Restore.
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="card p-10 text-center text-zinc-600">The archive is empty.</div>
      ) : (
        <ShipmentTable rows={rows} archived />
      )}
    </div>
  );
}
