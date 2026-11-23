// Restore an Aspi Rash backup:  npm run restore -- "E:\AspiRash-Backups\aspi-rash-....db"
// The current database is moved aside first (data\before-restore-<time>.db),
// so a restore can always be undone.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = process.env.ASPI_DATA_DIR ?? path.join(root, "data");
const dbPath = path.join(dataDir, "aspi-rash.db");
const src = process.argv[2];

function fail(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

if (!src) fail('Give the backup file, e.g.  npm run restore -- "E:\\AspiRash-Backups\\aspi-rash-2026-11-23_09-00-00.db"');
if (!fs.existsSync(src)) fail(`File not found: ${src}`);

// Refuse while the app is running, or the restore would be overwritten.
try {
  const res = await fetch("http://127.0.0.1:3210/api/health", { signal: AbortSignal.timeout(1500) });
  if (res.ok) fail('Aspi Rash is still running. Close it first (the "Stop Aspi Rash" shortcut), then try again.');
} catch {
  // not running: good
}

// Check the file really is an Aspi Rash database before touching anything.
try {
  const check = new DatabaseSync(src, { readOnly: true });
  const ok = check.prepare("PRAGMA integrity_check").get();
  const n = check.prepare("SELECT COUNT(*) AS n FROM shipments").get();
  check.close();
  if (Object.values(ok)[0] !== "ok") fail("This backup file is damaged (integrity check failed).");
  console.log(`  Backup contains ${n.n} shipment(s).`);
} catch (e) {
  fail(`This is not a valid Aspi Rash backup: ${e.message}`);
}

fs.mkdirSync(dataDir, { recursive: true });
const d = new Date();
const p = (n) => String(n).padStart(2, "0");
const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
if (fs.existsSync(dbPath)) {
  const aside = path.join(dataDir, `before-restore-${stamp}.db`);
  fs.renameSync(dbPath, aside);
  for (const ext of ["-wal", "-shm"]) {
    if (fs.existsSync(dbPath + ext)) fs.renameSync(dbPath + ext, aside + ext);
  }
  console.log(`  Current data kept aside as: ${aside}`);
}
fs.copyFileSync(src, dbPath);
console.log(`  ✓ Restored ${src}\n  Start Aspi Rash again to use it.`);
