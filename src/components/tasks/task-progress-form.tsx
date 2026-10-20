"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  recordTaskProgressAction,
  type TaskActionState,
} from "@/app/actions/tasks";

const initialState: TaskActionState = { error: null };

function inputHint(metricType: string, unit: string) {
  if (metricType === "DURATION") return { placeholder: "分钟", step: "0.1" };
  if (metricType === "DISTANCE") return { placeholder: "公里", step: "0.01" };
  return { placeholder: unit, step: "1" };
}

export function TaskProgressForm({
  taskId,
  metricType,
  unit,
}: {
  taskId: string;
  metricType: string;
  unit: string;
}) {
  const [state, action, pending] = useActionState(
    recordTaskProgressAction,
    initialState,
  );

  if (metricType === "CHECK") {
    return (
      <form action={action}>
        <input name="taskId" type="hidden" value={taskId} />
        <button className="min-h-11 w-full rounded-2xl bg-emerald-50 text-sm font-bold text-emerald-800" disabled={pending} type="submit">
          {pending ? "正在完成…" : "标记完成"}
        </button>
        {state.error ? <p className="mt-2 text-xs text-rose-700">{state.error}</p> : null}
      </form>
    );
  }

  if (metricType === "DURATION") {
    return <DurationProgressForm action={action} error={state.error} pending={pending} taskId={taskId} />;
  }

  const hint = inputHint(metricType, unit);

  return (
    <form action={action} className="grid grid-cols-[1fr_auto] gap-2">
      <input name="taskId" type="hidden" value={taskId} />
      <input
        aria-label={`本次完成${hint.placeholder}`}
        className="field min-w-0"
        min={hint.step === "1" ? "1" : "0.01"}
        name="value"
        placeholder={`本次完成（${hint.placeholder}）`}
        required
        step={hint.step}
        type="number"
      />
      <button className="rounded-2xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "记录中" : "记录"}
      </button>
      <input className="field col-span-2" maxLength={200} name="note" placeholder="备注（可选）" />
      {state.error ? <p className="col-span-2 text-xs text-rose-700">{state.error}</p> : null}
    </form>
  );
}

function DurationProgressForm({ action, error, pending, taskId }: {
  action: (payload: FormData) => void;
  error: string | null;
  pending: boolean;
  taskId: string;
}) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [minutes, setMinutes] = useState("");
  const accumulated = useRef(0);

  useEffect(() => {
    if (startedAt === null) return;
    const update = () => setElapsedSeconds(accumulated.current + Math.floor((Date.now() - startedAt) / 1000));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  function stopTimer() {
    if (startedAt === null) return;
    const total = accumulated.current + Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
    accumulated.current = total;
    setElapsedSeconds(total);
    setMinutes((total / 60).toFixed(2));
    setStartedAt(null);
  }

  function resetTimer() {
    accumulated.current = 0;
    setStartedAt(null);
    setElapsedSeconds(0);
    setMinutes("");
  }

  return (
    <form action={action} className="grid grid-cols-2 gap-2">
      <input name="taskId" type="hidden" value={taskId} />
      <div className="col-span-2 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
        <span className="font-mono text-lg font-black text-slate-800">{formatStopwatch(elapsedSeconds)}</span>
        <div className="flex gap-2">
          {startedAt === null ? <button className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800" onClick={() => setStartedAt(Date.now())} type="button">{elapsedSeconds ? "继续" : "开始计时"}</button> : <button className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800" onClick={stopTimer} type="button">暂停并填入</button>}
          {elapsedSeconds ? <button className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-bold text-slate-600" onClick={resetTimer} type="button">清零</button> : null}
        </div>
      </div>
      <input aria-label="本次完成分钟" className="field min-w-0" min="0.01" name="value" onChange={(event) => setMinutes(event.target.value)} placeholder="本次完成（分钟）" required step="0.01" type="number" value={minutes} />
      <button className="rounded-2xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-60" disabled={pending || startedAt !== null} type="submit">{pending ? "记录中" : "记录"}</button>
      <input className="field col-span-2" maxLength={200} name="note" placeholder="备注（可选）" />
      {startedAt !== null ? <p className="col-span-2 text-xs text-amber-700">请先暂停计时，再保存本次时长。</p> : null}
      {error ? <p className="col-span-2 text-xs text-rose-700">{error}</p> : null}
    </form>
  );
}

function formatStopwatch(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
