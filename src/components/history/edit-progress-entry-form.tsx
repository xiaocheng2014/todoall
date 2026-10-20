"use client";

import { useActionState } from "react";
import {
  updateProgressEntryAction,
  type ProgressEntryActionState,
} from "@/app/actions/progress-entries";

const initialState: ProgressEntryActionState = { error: null, success: null };

export function EditProgressEntryForm({
  entryId,
  value,
  metricType,
  note,
}: {
  entryId: string;
  value: number;
  metricType: string;
  note: string | null;
}) {
  const [state, action, pending] = useActionState(
    updateProgressEntryAction,
    initialState,
  );
  const step = metricType === "COUNT" || metricType === "QUANTITY" ? "1" : "0.01";
  const min = metricType === "COUNT" || metricType === "QUANTITY" ? "1" : "0.01";

  return (
    <form action={action} className="mt-3 grid grid-cols-[1fr_auto] gap-2">
      <input name="entryId" type="hidden" value={entryId} />
      <input className="field" defaultValue={value} min={min} name="value" required step={step} type="number" />
      <button className="rounded-xl bg-slate-900 px-4 text-sm font-bold text-white" disabled={pending} type="submit">
        {pending ? "保存中" : "保存"}
      </button>
      <input className="field col-span-2" defaultValue={note ?? ""} maxLength={200} name="note" placeholder="备注（可选）" />
      {state.error || state.success ? (
        <p className={`col-span-2 text-xs ${state.error ? "text-rose-700" : "text-emerald-700"}`}>
          {state.error ?? state.success}
        </p>
      ) : null}
    </form>
  );
}
