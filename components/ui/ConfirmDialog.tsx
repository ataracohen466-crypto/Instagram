"use client";

import { Modal } from "./Modal";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-ink-soft">{body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface-raised"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 ${
            danger ? "bg-warn" : "bg-primary"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
