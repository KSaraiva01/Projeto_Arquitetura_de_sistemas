"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { TASK_STATUS_LABELS, type ApiStageBlocker } from "@/lib/api-types";

/**
 * RN-01 — a equipe só avança com as tarefas obrigatórias aprovadas, salvo
 * decisão manual do mentor. Este diálogo é essa decisão: mostra exatamente o
 * que está pendente e pede um motivo, que vai para o histórico da equipe.
 * Serve ao kanban e ao detalhe da equipe.
 */
export default function ConfirmAdvanceDialog({
  teamName,
  targetLabel,
  blockers,
  reason,
  onReasonChange,
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  teamName: string;
  /** Completa "nas etapas anteriores à …" — ex.: "etapa 3". */
  targetLabel: string;
  blockers: ApiStageBlocker[];
  reason: string;
  onReasonChange: (value: string) => void;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  // Esc fecha; o foco vai para a caixa de motivo, que é o que se preenche.
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    reasonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-advance-title"
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="animate-dialog-in bg-card rounded-2xl border border-card-border shadow-xl max-w-lg w-full p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h2
              id="confirm-advance-title"
              className="text-base font-semibold text-foreground"
            >
              Avançar mesmo com pendências?
            </h2>
            <p className="text-sm text-muted mt-1">
              A equipe <strong>{teamName}</strong> tem tarefas
              obrigatórias sem aprovação nas etapas anteriores à {targetLabel}.
            </p>
          </div>
        </div>

        <ul className="space-y-2 mb-4 max-h-52 overflow-y-auto">
          {blockers.map((blocker) => (
            <li
              key={blocker.id}
              className="flex items-center justify-between gap-3 text-sm bg-hover-bg rounded-lg px-3 py-2"
            >
              <span className="text-foreground truncate">{blocker.title}</span>
              <span className="text-xs text-muted shrink-0" title={blocker.stageName}>
                Etapa {blocker.stage} · {TASK_STATUS_LABELS[blocker.status]}
              </span>
            </li>
          ))}
        </ul>

        <label className="block text-sm font-medium text-foreground mb-1.5">
          Motivo do avanço manual
          <span className="text-muted-light font-normal"> (opcional)</span>
        </label>
        <textarea
          ref={reasonRef}
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          rows={2}
          placeholder="Ex.: entregas revisadas presencialmente no encontro."
          className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
        />
        <p className="text-xs text-muted-light mt-1.5">
          O motivo fica registrado no histórico da equipe e na auditoria.
        </p>

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground rounded-lg hover:bg-hover-bg transition-colors inline-flex items-center gap-2"
          >
            Cancelar
            <kbd className="rounded border border-card-border px-1 text-[10px] font-normal text-muted-light">Esc</kbd>
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors inline-flex items-center gap-2 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Avançar mesmo assim
          </button>
        </div>
      </div>
    </div>
  );
}
