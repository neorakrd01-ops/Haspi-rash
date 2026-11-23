import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getDb, getSetting, nowIso, setSetting } from "./db";

export const DEFAULT_BACKUP_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "backups");
const KEEP = 60; // newest backup files kept; older ones are removed
const DAY_MS = 24 * 60 * 60 * 1000;
const FILE_RE = /^aspi-rash-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}(-\w+)?\.db$/;

export function backupDir(): string {
  return getSetting("backup_dir") || DEFAULT_BACKUP_DIR;
}

export type BackupStatus = {
  dir: string;
  lastAt: string | null;
  lastFile: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
};

export function backupStatus(): BackupStatus {
  return {
    dir: backupDir(),
    lastAt: getSetting("last_backup_at"),
    lastFile: getSetting("last_backup_file"),
    lastError: getSetting("last_backup_error"),
    lastErrorAt: getSetting("last_backup_error_at"),
  };
}

function stamp(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

/** Write a complete, consistent copy of the database into the backup folder. */
export function backupNow(kind: "manual" | "auto" = "manual"): string {
  const dir = backupDir();
  try {
    fs.mkdirSync(dir, { recursive: true });
    let file = path.join(dir, `aspi-rash-${stamp()}.db`);
    if (fs.existsSync(file)) file = file.replace(/\.db$/, `-${kind}.db`);
    getDb().exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
    setSetting("last_backup_at", nowIso());
    setSetting("last_backup_file", file);
    setSetting("last_backup_error", "");
    prune(dir);
    return file;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    setSetting("last_backup_error", `Could not write a backup to ${dir}: ${msg}`);
    setSetting("last_backup_error_at", nowIso());
    throw e;
  }
}

function prune(dir: string) {
  const files = listBackups(dir);
  for (const f of files.slice(KEEP)) {
    try {
      fs.unlinkSync(f.path);
    } catch {
      // a locked or missing file is not worth failing a backup over
    }
  }
}

export type BackupFile = { name: string; path: string; size: number; at: string };

export function listBackups(dir = backupDir()): BackupFile[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((n) => FILE_RE.test(n))
    .map((name) => {
      const p = path.join(/*turbopackIgnore: true*/ dir, name);
      const st = fs.statSync(p);
      return { name, path: p, size: st.size, at: st.mtime.toISOString() };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Make a backup if the last one is more than a day old. */
export function ensureDailyBackup() {
  const last = getSetting("last_backup_at");
  if (last && Date.now() - Date.parse(last) < DAY_MS) return;
  try {
    backupNow("auto");
  } catch {
    // recorded in settings; the warning banner shows it on every page
  }
}

const g = globalThis as unknown as { __aspiBackupTimer?: NodeJS.Timeout };

export function startBackupScheduler() {
  if (g.__aspiBackupTimer) return;
  ensureDailyBackup();
  g.__aspiBackupTimer = setInterval(ensureDailyBackup, 60 * 60 * 1000);
  g.__aspiBackupTimer.unref?.();
}

/** Days since the last good backup, or null if there has never been one. */
export function backupAgeDays(): number | null {
  const last = getSetting("last_backup_at");
  if (!last) return null;
  return (Date.now() - Date.parse(last)) / DAY_MS;
}
