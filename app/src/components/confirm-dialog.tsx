"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

type Request = { message: string; confirmLabel: string; resolve: (ok: boolean) => void };

/**
 * A themed replacement for window.confirm. Uses the native modal <dialog>, so focus stays
 * inside it, Esc cancels and focus returns to the button that opened it. The safe choice
 * (Peruuta) gets the focus first.
 */
export function useConfirm(): [React.ReactNode, (message: string, confirmLabel: string) => Promise<boolean>] {
  const [request, setRequest] = useState<Request | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (request && ref.current && !ref.current.open) ref.current.showModal();
  }, [request]);

  const ask = useCallback(
    (message: string, confirmLabel: string) => new Promise<boolean>((resolve) => setRequest({ message, confirmLabel, resolve })),
    [],
  );
  const close = (ok: boolean) => {
    request?.resolve(ok);
    ref.current?.close();
    setRequest(null);
  };

  const element = request ? (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        close(false);
      }}
      className="kp-dialog m-auto max-w-md border-2 border-text bg-surface p-5 text-text"
    >
      <p id={titleId} className="mb-4 font-medium">
        {request.message}
      </p>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" autoFocus onClick={() => close(false)} className="rounded border border-text bg-surface px-4 py-2 font-medium">
          Peruuta
        </button>
        <button type="button" onClick={() => close(true)} className="rounded bg-action px-4 py-2 font-bold text-action-text">
          {request.confirmLabel}
        </button>
      </div>
    </dialog>
  ) : null;
  return [element, ask];
}
