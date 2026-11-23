import { BackupDirForm, BackupNowButton } from "@/components/BackupControls";
import { backupStatus, DEFAULT_BACKUP_DIR, listBackups } from "@/lib/backup";
import { DB_PATH } from "@/lib/db";

export const metadata = { title: "Backups · Aspi Rash" };

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function size(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function BackupsPage() {
  const status = backupStatus();
  const files = listBackups();
  const onMainDisk = status.dir === DEFAULT_BACKUP_DIR;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Backups</h1>

      <section className="card space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="text-sm">
            <div>
              Last backup:{" "}
              <strong>{status.lastAt ? when(status.lastAt) : "never"}</strong>
            </div>
            <div className="text-zinc-600">
              A backup is made automatically when Aspi Rash starts and then every 24 hours while it runs. The newest
              60 are kept.
            </div>
          </div>
          <BackupNowButton />
        </div>
        {status.lastError && (
          <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {status.lastError}
          </p>
        )}
        {onMainDisk && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Backups are currently saved on this PC&apos;s own disk. If the disk fails they are lost too. Change the
            folder below to a USB drive or a cloud-synced folder.
          </p>
        )}
      </section>

      <section className="card p-4">
        <BackupDirForm dir={status.dir} />
      </section>

      <section className="card overflow-x-auto">
        <h2 className="px-4 pt-3 font-semibold">Backup files ({files.length})</h2>
        {files.length === 0 ? (
          <p className="px-4 py-3 text-sm text-zinc-500">No backup files in this folder yet.</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead className="border-y border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-600 uppercase">
              <tr>
                <th className="px-4 py-2 font-medium">File</th>
                <th className="px-4 py-2 font-medium">Saved</th>
                <th className="px-4 py-2 text-right font-medium">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {files.slice(0, 20).map((f) => (
                <tr key={f.name}>
                  <td className="px-4 py-2 font-mono text-xs">{f.name}</td>
                  <td className="px-4 py-2">{when(f.at)}</td>
                  <td className="px-4 py-2 text-right">{size(f.size)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card space-y-2 p-4 text-sm">
        <h2 className="font-semibold">How to restore a backup</h2>
        <ol className="list-decimal space-y-1 pl-5 text-zinc-700">
          <li>Close Aspi Rash by double-clicking the &quot;Stop Aspi Rash&quot; shortcut on the desktop.</li>
          <li>
            In the Aspi Rash folder, run:{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs">npm run restore -- &quot;full path of backup file&quot;</code>
          </li>
          <li>Start Aspi Rash again. The current data is kept aside first, so restoring can be undone.</li>
        </ol>
        <p className="text-xs text-zinc-500">Live database file: {DB_PATH}</p>
      </section>
    </div>
  );
}
