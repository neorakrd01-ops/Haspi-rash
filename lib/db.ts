import "server-only";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

// The whole company record lives in one SQLite file on this PC.
export const DATA_DIR =
  process.env.ASPI_DATA_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
export const DB_PATH = path.join(/*turbopackIgnore: true*/ DATA_DIR, "aspi-rash.db");

// Each entry upgrades the database by one version. Never edit an entry that
// has shipped — add a new one at the end instead.
const MIGRATIONS: string[] = [
  `
  CREATE TABLE shipments (
    id            INTEGER PRIMARY KEY,
    ref           TEXT NOT NULL,
    type          TEXT NOT NULL CHECK (type IN ('import','export')),
    status        TEXT NOT NULL,
    party         TEXT NOT NULL DEFAULT '',
    origin        TEXT NOT NULL DEFAULT '',
    destination   TEXT NOT NULL DEFAULT '',
    incoterm      TEXT NOT NULL DEFAULT '',
    carrier       TEXT NOT NULL DEFAULT '',
    container_no  TEXT NOT NULL DEFAULT '',
    bl_no         TEXT NOT NULL DEFAULT '',
    tracking_no   TEXT NOT NULL DEFAULT '',
    order_date    TEXT,
    expected_date TEXT,
    notes         TEXT NOT NULL DEFAULT '',
    archived_at   TEXT,
    created_at    TEXT NOT NULL,
    created_by    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    updated_by    TEXT NOT NULL
  );
  CREATE UNIQUE INDEX shipments_ref ON shipments(ref COLLATE NOCASE);
  CREATE INDEX shipments_status ON shipments(status);

  CREATE TABLE shipment_items (
    id               INTEGER PRIMARY KEY,
    shipment_id      INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    position         INTEGER NOT NULL,
    product          TEXT NOT NULL,
    quantity         REAL NOT NULL,
    unit             TEXT NOT NULL DEFAULT '',
    unit_price_minor INTEGER NOT NULL,
    currency         TEXT NOT NULL
  );
  CREATE INDEX items_shipment ON shipment_items(shipment_id);

  CREATE TABLE shipment_costs (
    id           INTEGER PRIMARY KEY,
    shipment_id  INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    position     INTEGER NOT NULL,
    kind         TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    currency     TEXT NOT NULL,
    note         TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX costs_shipment ON shipment_costs(shipment_id);

  CREATE TABLE history (
    id          INTEGER PRIMARY KEY,
    shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    at          TEXT NOT NULL,
    by          TEXT NOT NULL,
    action      TEXT NOT NULL,
    details     TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX history_shipment ON history(shipment_id);

  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];

function open(): DatabaseSync {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(
    "PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;",
  );
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  for (let v = row.user_version; v < MIGRATIONS.length; v++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  return db;
}

const g = globalThis as unknown as { __aspiDb?: DatabaseSync };

export function getDb(): DatabaseSync {
  if (!g.__aspiDb) g.__aspiDb = open();
  return g.__aspiDb;
}

/** Run fn inside one transaction: everything is saved, or nothing is. */
export function tx<T>(fn: (db: DatabaseSync) => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn(db);
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function getSetting(key: string): string | null {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

export function setSetting(key: string, value: string) {
  getDb()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(key, value);
}

export function nowIso(): string {
  return new Date().toISOString();
}
