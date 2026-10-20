"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type ConfirmSubmitButtonProps = {
  ariaLabel: string;
  children: ReactNode;
  message: string;
};

export function ConfirmSubmitButton({
  ariaLabel,
  children,
  message,
}: ConfirmSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-label={ariaLabel}
      className="min-h-10 w-full rounded-xl bg-rose-50 px-3 text-sm font-bold text-rose-700"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      type="submit"
    >
      {pending ? "删除中…" : children}
    </button>
  );
}
