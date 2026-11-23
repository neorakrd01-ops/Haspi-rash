"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveShipment, type FormCost, type FormItem, type FormPayload, type FormState } from "@/app/actions";
import {
  COST_KINDS,
  COST_LABELS,
  CURRENCIES,
  INCOTERMS,
  STATUSES,
  STATUS_LABELS,
} from "@/lib/constants";
import { addTo, formatTotals, lineTotal, toMinor, type Totals } from "@/lib/money";

const emptyItem = (currency = "USD"): FormItem => ({ product: "", quantity: "", unit: "", unitPrice: "", currency });
const emptyCost = (currency = "USD"): FormCost => ({ kind: "freight", amount: "", currency, note: "" });

export function ShipmentForm({
  id,
  initial,
  cancelHref,
}: {
  id?: number;
  initial: FormPayload;
  cancelHref: string;
}) {
  const [data, setData] = useState<FormPayload>(() => ({
    ...initial,
    items: initial.items.length ? initial.items : [emptyItem()],
    costs: initial.costs.length ? initial.costs : [emptyCost()],
  }));
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveShipment, { errors: {} });
  const err = state.errors;

  const set = <K extends keyof FormPayload>(k: K, v: FormPayload[K]) => setData((d) => ({ ...d, [k]: v }));
  const setItem = (i: number, patch: Partial<FormItem>) =>
    setData((d) => ({ ...d, items: d.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const setCost = (i: number, patch: Partial<FormCost>) =>
    setData((d) => ({ ...d, costs: d.costs.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  // Live totals while typing
  const goods: Totals = {};
  for (const it of data.items) {
    const q = Number(it.quantity.replace(/,/g, ""));
    const p = toMinor(it.unitPrice);
    if (Number.isFinite(q) && p !== null) addTo(goods, it.currency, lineTotal(q, p));
  }
  const costs: Totals = {};
  for (const c of data.costs) {
    const a = toMinor(c.amount);
    if (a !== null) addTo(costs, c.currency, a);
  }
  const total: Totals = { ...goods };
  for (const [cur, v] of Object.entries(costs)) addTo(total, cur, v);
  const lastCurrency = data.items[data.items.length - 1]?.currency ?? "USD";

  const text = (k: keyof FormPayload, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={k}>
        {label}
      </label>
      <input
        id={k}
        className={`field ${err[k] ? "field-error" : ""}`}
        value={data[k] as string}
        onChange={(e) => set(k, e.target.value as never)}
        {...props}
      />
      {err[k] && <p className="mt-1 text-xs text-red-600">{err[k]}</p>}
    </div>
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="payload" value={JSON.stringify(data)} />
      {id && <input type="hidden" name="id" value={id} />}

      {state.message && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{state.message}</div>
      )}

      {/* ---------------------------------------------------- basics */}
      <section className="card p-4">
        <h2 className="mb-3 font-semibold">Shipment</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="label">Type</span>
            <div className="flex gap-1">
              {(["import", "export"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("type", t)}
                  className={`btn flex-1 justify-center ${data.type === t ? "btn-primary" : ""}`}
                  aria-pressed={data.type === t}
                >
                  {t === "import" ? "Import" : "Export"}
                </button>
              ))}
            </div>
            {err.type && <p className="mt-1 text-xs text-red-600">{err.type}</p>}
          </div>
          {text("ref", "Reference no.", { placeholder: "Leave empty to auto-number" })}
          <div>
            <label className="label" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              className="field"
              value={data.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          {text("party", data.type === "import" ? "Supplier" : "Customer")}
          {text("origin", "Origin (country / city)")}
          {text("destination", "Destination (country / city)")}
          <div>
            <label className="label" htmlFor="incoterm">
              Incoterm
            </label>
            <select
              id="incoterm"
              className={`field ${err.incoterm ? "field-error" : ""}`}
              value={data.incoterm}
              onChange={(e) => set("incoterm", e.target.value)}
            >
              <option value="">—</option>
              {INCOTERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {text("carrier", "Shipping line / forwarder")}
          {text("container_no", "Container no.")}
          {text("bl_no", "Bill of lading no.")}
          {text("tracking_no", "Tracking no.")}
          <div />
          {text("order_date", "Order date", { type: "date" })}
          {text("expected_date", "Expected arrival", { type: "date" })}
        </div>
      </section>

      {/* ---------------------------------------------------- products */}
      <section className="card p-4">
        <h2 className="mb-3 font-semibold">Products</h2>
        <div className="space-y-2">
          <div className="hidden grid-cols-[1fr_110px_90px_130px_100px_120px_32px] gap-2 text-xs font-medium text-zinc-600 md:grid">
            <span>Product</span>
            <span>Quantity</span>
            <span>Unit</span>
            <span>Unit price</span>
            <span>Currency</span>
            <span className="text-right">Line total</span>
            <span />
          </div>
          {data.items.map((it, i) => {
            const q = Number(it.quantity.replace(/,/g, ""));
            const p = toMinor(it.unitPrice);
            const lt = Number.isFinite(q) && p !== null ? formatTotals({ [it.currency]: lineTotal(q, p) })[0] : "";
            const e = (f: string) => err[`items.${i}.${f}`];
            return (
              <div key={i} className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_110px_90px_130px_100px_120px_32px]">
                <input
                  aria-label="Product"
                  placeholder="Product"
                  className={`field col-span-2 md:col-span-1 ${e("product") ? "field-error" : ""}`}
                  value={it.product}
                  onChange={(ev) => setItem(i, { product: ev.target.value })}
                />
                <input
                  aria-label="Quantity"
                  placeholder="Qty"
                  inputMode="decimal"
                  className={`field ${e("quantity") ? "field-error" : ""}`}
                  value={it.quantity}
                  onChange={(ev) => setItem(i, { quantity: ev.target.value })}
                />
                <input
                  aria-label="Unit"
                  placeholder="pcs, kg, box"
                  className="field"
                  value={it.unit}
                  onChange={(ev) => setItem(i, { unit: ev.target.value })}
                />
                <input
                  aria-label="Unit price"
                  placeholder="0.00"
                  inputMode="decimal"
                  className={`field ${e("unitPrice") ? "field-error" : ""}`}
                  value={it.unitPrice}
                  onChange={(ev) => setItem(i, { unitPrice: ev.target.value })}
                />
                <select
                  aria-label="Currency"
                  className="field"
                  value={it.currency}
                  onChange={(ev) => setItem(i, { currency: ev.target.value })}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <div className="self-center text-right text-sm tabular-nums">{lt}</div>
                <button
                  type="button"
                  aria-label="Remove product"
                  className="btn justify-center px-0 text-zinc-500"
                  onClick={() => setData((d) => ({ ...d, items: d.items.filter((_, j) => j !== i) }))}
                >
                  ×
                </button>
                {(e("product") || e("quantity") || e("unitPrice")) && (
                  <p className="col-span-full text-xs text-red-600">
                    {[e("product"), e("quantity"), e("unitPrice")].filter(Boolean).join(" ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="btn mt-3"
          onClick={() => setData((d) => ({ ...d, items: [...d.items, emptyItem(lastCurrency)] }))}
        >
          + Add product
        </button>
      </section>

      {/* ---------------------------------------------------- costs */}
      <section className="card p-4">
        <h2 className="mb-3 font-semibold">Costs</h2>
        <div className="space-y-2">
          {data.costs.map((c, i) => {
            const e = (f: string) => err[`costs.${i}.${f}`];
            return (
              <div key={i} className="grid grid-cols-2 gap-2 md:grid-cols-[220px_150px_100px_1fr_32px]">
                <select
                  aria-label="Cost type"
                  className="field col-span-2 md:col-span-1"
                  value={c.kind}
                  onChange={(ev) => setCost(i, { kind: ev.target.value })}
                >
                  {COST_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {COST_LABELS[k]}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Amount"
                  placeholder="Amount"
                  inputMode="decimal"
                  className={`field ${e("amount") ? "field-error" : ""}`}
                  value={c.amount}
                  onChange={(ev) => setCost(i, { amount: ev.target.value })}
                />
                <select
                  aria-label="Currency"
                  className="field"
                  value={c.currency}
                  onChange={(ev) => setCost(i, { currency: ev.target.value })}
                >
                  {CURRENCIES.map((cur) => (
                    <option key={cur}>{cur}</option>
                  ))}
                </select>
                <input
                  aria-label="Note"
                  placeholder="Note (optional)"
                  className="field col-span-2 md:col-span-1"
                  value={c.note}
                  onChange={(ev) => setCost(i, { note: ev.target.value })}
                />
                <button
                  type="button"
                  aria-label="Remove cost"
                  className="btn justify-center px-0 text-zinc-500"
                  onClick={() => setData((d) => ({ ...d, costs: d.costs.filter((_, j) => j !== i) }))}
                >
                  ×
                </button>
                {e("amount") && <p className="col-span-full text-xs text-red-600">{e("amount")}</p>}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="btn mt-3"
          onClick={() => setData((d) => ({ ...d, costs: [...d.costs, emptyCost(lastCurrency)] }))}
        >
          + Add cost
        </button>

        <dl className="mt-4 grid gap-2 border-t border-zinc-200 pt-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-zinc-500">Goods value</dt>
            <dd className="tabular-nums">{formatTotals(goods).join(" + ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Costs</dt>
            <dd className="tabular-nums">{formatTotals(costs).join(" + ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Total</dt>
            <dd className="font-semibold tabular-nums">{formatTotals(total).join(" + ") || "—"}</dd>
          </div>
        </dl>
      </section>

      {/* ---------------------------------------------------- notes */}
      <section className="card p-4">
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          className="field"
          value={data.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </section>

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : id ? "Save changes" : "Create shipment"}
        </button>
        <Link href={cancelHref} className="btn">
          Cancel
        </Link>
      </div>
    </form>
  );
}
