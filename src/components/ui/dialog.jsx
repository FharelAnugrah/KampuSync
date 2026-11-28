"use client";
import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { bindTopLayerDialog, closeTopLayer } from "@/lib/top-layer";
import { Button } from "./button";

export function Modal({ open, onClose, title, description, children, className }) {
  const titleId = React.useId();
  const dialogRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.removeAttribute("data-closing");
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      void closeTopLayer(dialog);
    }
  }, [open]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    return bindTopLayerDialog(dialog, () => onCloseRef.current());
  }, []);

  function requestClose() {
    const dialog = dialogRef.current;
    if (!dialog) {
      onClose();
      return;
    }
    void closeTopLayer(dialog).then(() => {
      onClose();
    });
  }

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      className={cn(
        "kampus-dialog w-full max-w-lg rounded-xl border border-[#E2E8F0] bg-white shadow-xl",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] px-5 py-4">
        <div>
          <h2 id={titleId} className="text-base font-semibold text-[#172033]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-[#64748B]">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={requestClose}
          aria-label="Tutup dialog"
          className="rounded-lg p-1.5 text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#172033] cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  destructive = false,
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-md">
      <p className="text-sm leading-relaxed text-[#475569]">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? "destructive" : "default"}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "Memproses..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
