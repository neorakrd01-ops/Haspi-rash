"use client";

import { useActionState } from "react";
import { backupNowAction, setBackupDirAction, type BackupState } from "@/app/actions";

function Message({ state }: { state: BackupState }) {
  if (state.ok) return <p className="mt-2 text-sm text-emerald-700">✓ {state.ok}</p>;
  if (state.error) return <p className="mt-2 text-sm text-red-700">{state.error}</p>;
  return null;
}

export function BackupNowButton() {
  const [state, action, pending] = useActionState<BackupState, FormData>(() => backupNowAction(), {});
  return (
    <form action={action}>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Backing up…" : "Back up now"}
      </button>
      <Message state={state} />
    </form>
  );
}

export function BackupDirForm({ dir }: { dir: string }) {
  const [state, action, pending] = useActionState<BackupState, FormData>(setBackupDirAction, {});
  return (
    <form action={action}>
      <label className="label" htmlFor="dir">
        Backup folder
      </label>
      <div className="flex flex-wrap gap-2">
        <input id="dir" name="dir" defaultValue={dir} className="field min-w-[280px] flex-1 font-mono" />
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : "Change folder"}
        </button>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Pick a folder that is not on this PC&apos;s main disk, such as a USB drive (E:\AspiRash-Backups) or a Google
        Drive / OneDrive folder, so a broken PC doesn&apos;t take the backups with it.
      </p>
      <Message state={state} />
    </form>
  );
}
