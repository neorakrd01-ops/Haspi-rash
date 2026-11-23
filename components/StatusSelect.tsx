"use client";

import { useRef, useTransition } from "react";
import { changeStatus } from "@/app/actions";
import { STATUSES, STATUS_LABELS, STATUS_STYLES, type Status } from "@/lib/constants";

/** A status dropdown that saves as soon as you pick a new value. */
export function StatusSelect({ id, status }: { id: number; status: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form ref={formRef} action={(fd) => startTransition(() => changeStatus(fd))}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        aria-label="Status"
        defaultValue={status}
        key={status}
        disabled={pending}
        onChange={() => formRef.current?.requestSubmit()}
        className={`cursor-pointer rounded-full border-0 py-0.5 pr-7 pl-2 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status as Status] ?? ""} ${pending ? "opacity-50" : ""}`}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
