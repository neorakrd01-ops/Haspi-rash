import type { FormPayload } from "@/app/actions";
import { minorToInput } from "./money";
import type { ShipmentDetail } from "./shipments";

export function blankPayload(type: "import" | "export" = "import"): FormPayload {
  return {
    ref: "",
    type,
    status: "ordered",
    party: "",
    origin: "",
    destination: "",
    incoterm: "",
    carrier: "",
    container_no: "",
    bl_no: "",
    tracking_no: "",
    order_date: new Date().toISOString().slice(0, 10),
    expected_date: "",
    notes: "",
    items: [],
    costs: [],
  };
}

export function toPayload(s: ShipmentDetail): FormPayload {
  return {
    ref: s.ref,
    type: s.type,
    status: s.status,
    party: s.party,
    origin: s.origin,
    destination: s.destination,
    incoterm: s.incoterm,
    carrier: s.carrier,
    container_no: s.container_no,
    bl_no: s.bl_no,
    tracking_no: s.tracking_no,
    order_date: s.order_date ?? "",
    expected_date: s.expected_date ?? "",
    notes: s.notes,
    items: s.items.map((it) => ({
      product: it.product,
      quantity: String(it.quantity),
      unit: it.unit,
      unitPrice: minorToInput(it.unit_price_minor),
      currency: it.currency,
    })),
    costs: s.costs.map((c) => ({
      kind: c.kind,
      amount: minorToInput(c.amount_minor),
      currency: c.currency,
      note: c.note,
    })),
  };
}
