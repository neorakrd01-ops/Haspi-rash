"use server";

import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  COST_KINDS,
  CURRENCIES,
  INCOTERMS,
  SHIPMENT_TYPES,
  STATUSES,
  type Status,
} from "@/lib/constants";
import { toMinor } from "@/lib/money";
import {
  archiveShipment,
  createShipment,
  nextRef,
  refExists,
  restoreShipment,
  setStatus,
  updateShipment,
  type ShipmentInput,
} from "@/lib/shipments";
import { backupNow } from "@/lib/backup";
import { setSetting } from "@/lib/db";

// ------------------------------------------------------------ shipment form

/** What the form sends: everything as text, exactly as typed. */
export type FormItem = { product: string; quantity: string; unit: string; unitPrice: string; currency: string };
export type FormCost = { kind: string; amount: string; currency: string; note: string };
export type FormPayload = {
  ref: string;
  type: string;
  status: string;
  party: string;
  origin: string;
  destination: string;
  incoterm: string;
  carrier: string;
  container_no: string;
  bl_no: string;
  tracking_no: string;
  order_date: string;
  expected_date: string;
  notes: string;
  items: FormItem[];
  costs: FormCost[];
};

export type FormState = { errors: Record<string, string>; message?: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validate(p: FormPayload, id?: number): { input?: ShipmentInput; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const t = (s: unknown) => (typeof s === "string" ? s.trim() : "");

  if (!SHIPMENT_TYPES.includes(p.type as never)) errors.type = "Choose Import or Export.";
  if (!STATUSES.includes(p.status as never)) errors.status = "Choose a status.";
  if (t(p.incoterm) && !INCOTERMS.includes(t(p.incoterm) as never)) errors.incoterm = "Unknown incoterm.";

  let ref = t(p.ref);
  if (!ref && !errors.type) ref = nextRef(p.type as "import" | "export");
  if (ref && refExists(ref, id)) errors.ref = `Reference "${ref}" is already used by another shipment.`;

  for (const f of ["order_date", "expected_date"] as const) {
    if (t(p[f]) && !DATE_RE.test(t(p[f]))) errors[f] = "Use a valid date.";
  }

  // Blank rows are ignored. Error keys use the row's position in the form.
  const items = (p.items ?? [])
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => t(it.product) || t(it.quantity) || t(it.unitPrice))
    .map(({ it, i }) => {
      const qty = Number(t(it.quantity).replace(/,/g, ""));
      const price = toMinor(t(it.unitPrice));
      if (!t(it.product)) errors[`items.${i}.product`] = "Enter the product.";
      if (!t(it.quantity) || !Number.isFinite(qty) || qty <= 0) errors[`items.${i}.quantity`] = "Quantity must be more than 0.";
      if (price === null || price < 0) errors[`items.${i}.unitPrice`] = "Enter a price (0 or more).";
      if (!CURRENCIES.includes(it.currency as never)) errors[`items.${i}.currency`] = "Choose a currency.";
      return {
        product: t(it.product),
        quantity: qty,
        unit: t(it.unit),
        unit_price_minor: price ?? 0,
        currency: it.currency,
      };
    });

  const costs = (p.costs ?? [])
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => t(c.amount) || t(c.note))
    .map(({ c, i }) => {
      const amt = toMinor(t(c.amount));
      if (!COST_KINDS.includes(c.kind as never)) errors[`costs.${i}.kind`] = "Choose a cost type.";
      if (amt === null || amt < 0) errors[`costs.${i}.amount`] = "Enter an amount (0 or more).";
      if (!CURRENCIES.includes(c.currency as never)) errors[`costs.${i}.currency`] = "Choose a currency.";
      return {
        kind: c.kind as (typeof COST_KINDS)[number],
        amount_minor: amt ?? 0,
        currency: c.currency,
        note: t(c.note),
      };
    });

  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    input: {
      ref,
      type: p.type as ShipmentInput["type"],
      status: p.status as Status,
      party: t(p.party),
      origin: t(p.origin),
      destination: t(p.destination),
      incoterm: t(p.incoterm),
      carrier: t(p.carrier),
      container_no: t(p.container_no),
      bl_no: t(p.bl_no),
      tracking_no: t(p.tracking_no),
      order_date: t(p.order_date) || null,
      expected_date: t(p.expected_date) || null,
      notes: t(p.notes),
      items,
      costs,
    },
  };
}

export async function saveShipment(_prev: FormState, formData: FormData): Promise<FormState> {
  let payload: FormPayload;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { errors: {}, message: "The form could not be read. Please try again." };
  }
  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : undefined;

  const { input, errors } = validate(payload, id);
  if (!input) return { errors, message: "Please fix the highlighted fields." };

  let savedId: number;
  try {
    if (id) {
      updateShipment(id, input);
      savedId = id;
    } else {
      savedId = createShipment(input);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { errors: {}, message: `Could not save: ${msg}` };
  }
  revalidatePath("/", "layout");
  redirect(`/shipments/${savedId}`);
}

// ------------------------------------------------------------ quick actions

export async function changeStatus(formData: FormData) {
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || !STATUSES.includes(status as never)) return;
  setStatus(id, status as Status);
  revalidatePath("/", "layout");
}

export async function archiveAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  archiveShipment(id);
  revalidatePath("/", "layout");
  redirect("/shipments");
}

export async function restoreAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  restoreShipment(id);
  revalidatePath("/", "layout");
  redirect(`/shipments/${id}`);
}

// ------------------------------------------------------------ backups

export type BackupState = { ok?: string; error?: string };

export async function backupNowAction(): Promise<BackupState> {
  try {
    const file = backupNow("manual");
    revalidatePath("/", "layout");
    return { ok: `Backup saved: ${file}` };
  } catch (e) {
    revalidatePath("/", "layout");
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function setBackupDirAction(_prev: BackupState, formData: FormData): Promise<BackupState> {
  const dir = String(formData.get("dir") ?? "").trim();
  if (!dir) return { error: "Enter a folder path." };
  if (!path.isAbsolute(dir)) return { error: "Use a full folder path, like E:\\AspiRash-Backups." };
  setSetting("backup_dir", dir);
  try {
    const file = backupNow("manual");
    revalidatePath("/", "layout");
    return { ok: `Backup folder changed. First backup saved: ${file}` };
  } catch (e) {
    revalidatePath("/", "layout");
    return { error: `Folder saved, but the backup failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}
