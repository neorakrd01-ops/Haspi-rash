import { notFound } from "next/navigation";
import { ShipmentForm } from "@/components/ShipmentForm";
import { toPayload } from "@/lib/form";
import { getShipment } from "@/lib/shipments";

export default async function EditShipmentPage({ params }: PageProps<"/shipments/[id]/edit">) {
  const { id } = await params;
  const s = getShipment(Number(id));
  if (!s) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit {s.ref}</h1>
      {s.archived_at && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This shipment is in the archive. Restore it to see it in the main list again.
        </p>
      )}
      <ShipmentForm id={s.id} initial={toPayload(s)} cancelHref={`/shipments/${s.id}`} />
    </div>
  );
}
