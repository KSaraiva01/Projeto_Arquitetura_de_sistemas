"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

/**
 * Confirmação de ação que não tem volta (excluir equipe, conta, usuário).
 * Mesmo visual do diálogo da RN-01; Esc e clique fora cancelam. Com
 * `children` o diálogo pode pedir um dado extra (ex.: a senha).
 */
export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  tone = "danger",
  busy = false,
  confirmDisabled = false,
  onCancel,
  onConfirm,
  children,
}: {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Sem campo extra, o foco vai para "Cancelar": Enter por engano não confirma.
    if (!children) cancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel, children]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <form
        className="animate-dialog-in w-full max-w-md rounded-2xl border border-card-border bg-card p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && !confirmDisabled) onConfirm();
        }}
      >
        <div className="mb-4 flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              tone === "danger" ? "bg-danger/10" : "bg-primary/10"
            }`}
          >
            <AlertTriangle className={`h-5 w-5 ${tone === "danger" ? "text-danger" : "text-primary"}`} />
          </div>
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-foreground">
              {title}
            </h2>
            <div className="mt-1 text-sm text-muted">{description}</div>
          </div>
        </div>

        {children}

        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-hover-bg hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || confirmDisabled}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              tone === "danger" ? "bg-danger hover:opacity-90" : "bg-primary hover:bg-primary-dark"
            }`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
