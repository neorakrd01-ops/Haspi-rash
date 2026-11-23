import { ShipmentForm } from "@/components/ShipmentForm";
import { blankPayload } from "@/lib/form";

export const metadata = { title: "New shipment · Aspi Rash" };

export default async function NewShipmentPage({ searchParams }: PageProps<"/shipments/new">) {
  const sp = await searchParams;
  const type = sp.type === "export" ? "export" : "import";
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New shipment</h1>
      <ShipmentForm initial={blankPayload(type)} cancelHref="/shipments" />
    </div>
  );
}
