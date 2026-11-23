// Fixed lists used across Aspi Rash. Keys are stored in the database;
// labels are what the screens show (Arabic labels arrive in Phase 2A).

export const SHIPMENT_TYPES = ["import", "export"] as const;
export type ShipmentType = (typeof SHIPMENT_TYPES)[number];
export const TYPE_LABELS: Record<ShipmentType, string> = {
  import: "Import",
  export: "Export",
};

export const STATUSES = [
  "ordered",
  "shipped",
  "in_transit",
  "at_customs",
  "delivered",
  "on_hold",
  "held_customs",
  "returned",
  "damaged",
  "cancelled",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  ordered: "Ordered",
  shipped: "Shipped",
  in_transit: "In transit",
  at_customs: "At customs",
  delivered: "Delivered",
  on_hold: "On hold",
  held_customs: "Held / rejected at customs",
  returned: "Returned",
  damaged: "Damaged / short",
  cancelled: "Cancelled",
};

// Tailwind classes for each status badge.
export const STATUS_STYLES: Record<Status, string> = {
  ordered: "bg-slate-100 text-slate-700 ring-slate-300",
  shipped: "bg-sky-50 text-sky-800 ring-sky-300",
  in_transit: "bg-blue-50 text-blue-800 ring-blue-300",
  at_customs: "bg-amber-50 text-amber-800 ring-amber-300",
  delivered: "bg-emerald-50 text-emerald-800 ring-emerald-300",
  on_hold: "bg-zinc-100 text-zinc-700 ring-zinc-300",
  held_customs: "bg-red-50 text-red-800 ring-red-300",
  returned: "bg-purple-50 text-purple-800 ring-purple-300",
  damaged: "bg-orange-50 text-orange-800 ring-orange-300",
  cancelled: "bg-zinc-100 text-zinc-500 ring-zinc-300 line-through",
};

export const COST_KINDS = [
  "freight",
  "insurance",
  "duty",
  "fees",
  "local_transport",
  "other",
] as const;
export type CostKind = (typeof COST_KINDS)[number];
export const COST_LABELS: Record<CostKind, string> = {
  freight: "Freight",
  insurance: "Insurance",
  duty: "Customs duty",
  fees: "Fees (port, broker, clearance)",
  local_transport: "Local transport",
  other: "Other",
};

export const CURRENCIES = ["USD", "IQD", "EUR", "AED", "TRY", "CNY"] as const;
export type Currency = (typeof CURRENCIES)[number];
// Decimal places shown on screen (IQD is shown without fils).
export const CURRENCY_DECIMALS: Record<string, number> = {
  USD: 2,
  IQD: 0,
  EUR: 2,
  AED: 2,
  TRY: 2,
  CNY: 2,
};

export const INCOTERMS = [
  "EXW",
  "FCA",
  "FAS",
  "FOB",
  "CFR",
  "CIF",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
] as const;

// Phase 1 has one user; every change is still stamped with a name so that
// adding a team later needs no data rewrite.
export const CURRENT_USER = process.env.ASPI_USER || "Owner";
