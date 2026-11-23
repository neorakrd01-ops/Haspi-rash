import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { getDb, nowIso, tx } from "./db";
import {
  COST_LABELS,
  CURRENT_USER,
  STATUS_LABELS,
  TYPE_LABELS,
  type CostKind,
  type Status,
  type ShipmentType,
} from "./constants";
import { addTo, formatMoney, lineTotal, type Totals } from "./money";

export type Item = {
  product: string;
  quantity: number;
  unit: string;
  unit_price_minor: number;
  currency: string;
};

export type Cost = {
  kind: CostKind;
  amount_minor: number;
  currency: string;
  note: string;
};

export type ShipmentFields = {
  ref: string;
  type: ShipmentType;
  status: Status;
  party: string;
  origin: string;
  destination: string;
  incoterm: string;
  carrier: string;
  container_no: string;
  bl_no: string;
  tracking_no: string;
  order_date: string | null;
  expected_date: string | null;
  notes: string;
};

export type ShipmentInput = ShipmentFields & { items: Item[]; costs: Cost[] };

export type Shipment = ShipmentFields & {
  id: number;
  archived_at: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
};

export type ShipmentDetail = Shipment & {
  items: Item[];
  costs: Cost[];
  goods: Totals;
  costTotals: Totals;
  total: Totals;
};

export type HistoryEntry = {
  id: number;
  at: string;
  by: string;
  action: string;
  details: string;
};

const FIELD_LABELS: Record<keyof ShipmentFields, string> = {
  ref: "Reference",
  type: "Type",
  status: "Status",
  party: "Supplier / customer",
  origin: "Origin",
  destination: "Destination",
  incoterm: "Incoterm",
  carrier: "Shipping line / forwarder",
  container_no: "Container no.",
  bl_no: "Bill of lading no.",
  tracking_no: "Tracking no.",
  order_date: "Order date",
  expected_date: "Expected arrival",
  notes: "Notes",
};

const FIELDS = Object.keys(FIELD_LABELS) as (keyof ShipmentFields)[];

// node:sqlite returns null-prototype rows; copy into plain objects so they
// can be passed to client components.
function plain<T>(row: unknown): T {
  return { ...(row as object) } as T;
}

// ---------------------------------------------------------------- reading

export type ListFilter = {
  q?: string;
  type?: string;
  status?: string;
  sort?: string;
  archived?: boolean;
};

export type ShipmentRow = Shipment & { total: Totals; itemCount: number };

const SORTS: Record<string, string> = {
  order_desc: "COALESCE(order_date, '') DESC, id DESC",
  order_asc: "COALESCE(order_date, '9999') ASC, id ASC",
  expected_asc: "COALESCE(expected_date, '9999') ASC, id ASC",
  expected_desc: "COALESCE(expected_date, '') DESC, id DESC",
  updated_desc: "updated_at DESC",
};

export function listShipments(f: ListFilter): ShipmentRow[] {
  const db = getDb();
  const where: string[] = [f.archived ? "archived_at IS NOT NULL" : "archived_at IS NULL"];
  const args: string[] = [];
  if (f.q && f.q.trim()) {
    const like = `%${f.q.trim()}%`;
    where.push(
      "(ref LIKE ? OR party LIKE ? OR container_no LIKE ? OR bl_no LIKE ? OR tracking_no LIKE ? OR id IN (SELECT shipment_id FROM shipment_items WHERE product LIKE ?))",
    );
    args.push(like, like, like, like, like, like);
  }
  if (f.type) {
    where.push("type = ?");
    args.push(f.type);
  }
  if (f.status) {
    where.push("status = ?");
    args.push(f.status);
  }
  const order = SORTS[f.sort ?? ""] ?? SORTS.order_desc;
  const rows = db
    .prepare(`SELECT * FROM shipments WHERE ${where.join(" AND ")} ORDER BY ${order}`)
    .all(...args)
    .map((r) => plain<Shipment>(r));
  if (rows.length === 0) return [];

  const totals = totalsByShipment(db);
  const counts = new Map<number, number>();
  for (const r of db
    .prepare("SELECT shipment_id, COUNT(*) AS n FROM shipment_items GROUP BY shipment_id")
    .all() as { shipment_id: number; n: number }[]) {
    counts.set(r.shipment_id, r.n);
  }
  return rows.map((s) => ({
    ...s,
    total: totals.get(s.id) ?? {},
    itemCount: counts.get(s.id) ?? 0,
  }));
}

function totalsByShipment(db: DatabaseSync): Map<number, Totals> {
  const map = new Map<number, Totals>();
  const add = (id: number, cur: string, v: number) => {
    if (!map.has(id)) map.set(id, {});
    addTo(map.get(id)!, cur, v);
  };
  for (const r of db
    .prepare("SELECT shipment_id, quantity, unit_price_minor, currency FROM shipment_items")
    .all() as { shipment_id: number; quantity: number; unit_price_minor: number; currency: string }[]) {
    add(r.shipment_id, r.currency, lineTotal(r.quantity, r.unit_price_minor));
  }
  for (const r of db
    .prepare("SELECT shipment_id, SUM(amount_minor) AS t, currency FROM shipment_costs GROUP BY shipment_id, currency")
    .all() as { shipment_id: number; t: number; currency: string }[]) {
    add(r.shipment_id, r.currency, r.t);
  }
  return map;
}

export function getShipment(id: number): ShipmentDetail | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM shipments WHERE id = ?").get(id);
  if (!row) return null;
  const s = plain<Shipment>(row);
  const items = db
    .prepare(
      "SELECT product, quantity, unit, unit_price_minor, currency FROM shipment_items WHERE shipment_id = ? ORDER BY position",
    )
    .all(id)
    .map((r) => plain<Item>(r));
  const costs = db
    .prepare(
      "SELECT kind, amount_minor, currency, note FROM shipment_costs WHERE shipment_id = ? ORDER BY position",
    )
    .all(id)
    .map((r) => plain<Cost>(r));
  const goods: Totals = {};
  for (const it of items) addTo(goods, it.currency, lineTotal(it.quantity, it.unit_price_minor));
  const costTotals: Totals = {};
  for (const c of costs) addTo(costTotals, c.currency, c.amount_minor);
  const total: Totals = { ...goods };
  for (const [cur, v] of Object.entries(costTotals)) addTo(total, cur, v);
  return { ...s, items, costs, goods, costTotals, total };
}

export function getHistory(id: number): HistoryEntry[] {
  return getDb()
    .prepare("SELECT id, at, by, action, details FROM history WHERE shipment_id = ? ORDER BY id DESC")
    .all(id)
    .map((r) => plain<HistoryEntry>(r));
}

export function refExists(ref: string, exceptId?: number): boolean {
  const row = getDb()
    .prepare("SELECT id FROM shipments WHERE ref = ? COLLATE NOCASE AND id != ?")
    .get(ref.trim(), exceptId ?? -1);
  return !!row;
}

/** Next free reference like IMP-2026-007 / EXP-2026-012. */
export function nextRef(type: ShipmentType): string {
  const prefix = `${type === "import" ? "IMP" : "EXP"}-${new Date().getFullYear()}-`;
  const rows = getDb()
    .prepare("SELECT ref FROM shipments WHERE ref LIKE ?")
    .all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  for (const r of rows) {
    const n = parseInt(r.ref.slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

// ---------------------------------------------------------------- writing

function insertLines(db: DatabaseSync, id: number, items: Item[], costs: Cost[]) {
  const insItem = db.prepare(
    "INSERT INTO shipment_items (shipment_id, position, product, quantity, unit, unit_price_minor, currency) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  items.forEach((it, i) =>
    insItem.run(id, i, it.product, it.quantity, it.unit, it.unit_price_minor, it.currency),
  );
  const insCost = db.prepare(
    "INSERT INTO shipment_costs (shipment_id, position, kind, amount_minor, currency, note) VALUES (?, ?, ?, ?, ?, ?)",
  );
  costs.forEach((c, i) => insCost.run(id, i, c.kind, c.amount_minor, c.currency, c.note));
}

function log(db: DatabaseSync, id: number, action: string, details = "") {
  db.prepare("INSERT INTO history (shipment_id, at, by, action, details) VALUES (?, ?, ?, ?, ?)").run(
    id,
    nowIso(),
    CURRENT_USER,
    action,
    details,
  );
}

function display(field: keyof ShipmentFields, v: unknown): string {
  if (v === null || v === undefined || v === "") return "(empty)";
  if (field === "status") return STATUS_LABELS[v as Status] ?? String(v);
  if (field === "type") return TYPE_LABELS[v as ShipmentType] ?? String(v);
  return String(v);
}

function describeItem(it: Item) {
  return `${it.product} × ${it.quantity}${it.unit ? " " + it.unit : ""} @ ${formatMoney(it.unit_price_minor, it.currency)}`;
}

function describeCost(c: Cost) {
  return `${COST_LABELS[c.kind] ?? c.kind}: ${formatMoney(c.amount_minor, c.currency)}${c.note ? ` (${c.note})` : ""}`;
}

export function createShipment(input: ShipmentInput): number {
  return tx((db) => {
    const now = nowIso();
    const cols = [...FIELDS, "created_at", "created_by", "updated_at", "updated_by"];
    const result = db
      .prepare(`INSERT INTO shipments (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`)
      .run(...FIELDS.map((f) => input[f]), now, CURRENT_USER, now, CURRENT_USER);
    const id = Number(result.lastInsertRowid);
    insertLines(db, id, input.items, input.costs);
    log(
      db,
      id,
      "Created",
      [
        `${TYPE_LABELS[input.type]} ${input.ref}, status ${STATUS_LABELS[input.status]}`,
        ...input.items.map((it) => "Product: " + describeItem(it)),
        ...input.costs.map((c) => "Cost: " + describeCost(c)),
      ].join("\n"),
    );
    return id;
  });
}

export function updateShipment(id: number, input: ShipmentInput) {
  const before = getShipment(id);
  if (!before) throw new Error("Shipment not found");
  tx((db) => {
    const changes: string[] = [];
    for (const f of FIELDS) {
      if ((before[f] ?? null) !== (input[f] ?? null) && !(before[f] === "" && input[f] === null)) {
        changes.push(`${FIELD_LABELS[f]}: ${display(f, before[f])} → ${display(f, input[f])}`);
      }
    }
    const oldItems = before.items.map(describeItem);
    const newItems = input.items.map(describeItem);
    for (const d of oldItems.filter((x) => !newItems.includes(x))) changes.push(`Removed product: ${d}`);
    for (const d of newItems.filter((x) => !oldItems.includes(x))) changes.push(`Added product: ${d}`);
    const oldCosts = before.costs.map(describeCost);
    const newCosts = input.costs.map(describeCost);
    for (const d of oldCosts.filter((x) => !newCosts.includes(x))) changes.push(`Removed cost: ${d}`);
    for (const d of newCosts.filter((x) => !oldCosts.includes(x))) changes.push(`Added cost: ${d}`);
    if (changes.length === 0) return;

    db.prepare(
      `UPDATE shipments SET ${FIELDS.map((f) => `${f} = ?`).join(", ")}, updated_at = ?, updated_by = ? WHERE id = ?`,
    ).run(...FIELDS.map((f) => input[f]), nowIso(), CURRENT_USER, id);
    db.prepare("DELETE FROM shipment_items WHERE shipment_id = ?").run(id);
    db.prepare("DELETE FROM shipment_costs WHERE shipment_id = ?").run(id);
    insertLines(db, id, input.items, input.costs);
    log(db, id, "Edited", changes.join("\n"));
  });
}

export function setStatus(id: number, status: Status) {
  tx((db) => {
    const row = db.prepare("SELECT status FROM shipments WHERE id = ?").get(id) as
      | { status: Status }
      | undefined;
    if (!row || row.status === status) return;
    db.prepare("UPDATE shipments SET status = ?, updated_at = ?, updated_by = ? WHERE id = ?").run(
      status,
      nowIso(),
      CURRENT_USER,
      id,
    );
    log(db, id, "Status changed", `${STATUS_LABELS[row.status]} → ${STATUS_LABELS[status]}`);
  });
}

/** Safe delete: the shipment moves to the archive and can be restored. */
export function archiveShipment(id: number) {
  tx((db) => {
    db.prepare(
      "UPDATE shipments SET archived_at = ?, updated_at = ?, updated_by = ? WHERE id = ? AND archived_at IS NULL",
    ).run(nowIso(), nowIso(), CURRENT_USER, id);
    log(db, id, "Archived", "Moved to the archive (can be restored)");
  });
}

export function restoreShipment(id: number) {
  tx((db) => {
    db.prepare(
      "UPDATE shipments SET archived_at = NULL, updated_at = ?, updated_by = ? WHERE id = ? AND archived_at IS NOT NULL",
    ).run(nowIso(), CURRENT_USER, id);
    log(db, id, "Restored", "Brought back from the archive");
  });
}
