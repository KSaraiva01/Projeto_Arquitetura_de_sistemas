"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, X } from "lucide-react";
import ConfirmAdvanceDialog from "./ConfirmAdvanceDialog";
import StagePipeline from "./StagePipeline";
import { JourneyStatusBadge } from "./StatusBadge";
import { api, ApiError, describeError } from "@/lib/api";
import {
  journeyStageLabel,
  type ApiJourneyStage,
  type ApiStageBlocker,
  type ApiTeamDetail,
} from "@/lib/api-types";

interface JourneyCardProps {
  detail: ApiTeamDetail;
  /** ADMIN e MENTOR mexem na jornada (o backend confere de novo). */
  canManage: boolean;
  /** Recarrega a equipe: etapa, status e histórico mudam juntos. */
  onChanged: () => Promise<void>;
  onToast: (kind: "ok" | "erro", text: string) => void;
}

const inputClass =
  "w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

/** "etapa 5" / "etapa extra “Validação”" — completa "nas etapas anteriores à …". */
function targetLabel(stage: ApiJourneyStage) {
  return stage.number === null ? `etapa extra “${stage.name}”` : `etapa ${stage.number}`;
}

/**
 * Jornada de UMA equipe: as 6 etapas padrão mais as extras que o mentor
 * incluir só para ela (decisão da coordenação: "padrão 6, ajustável por
 * equipe; depois da última, encaminha ao InovAMF").
 *
 * As setas andam uma etapa por vez pela jornada real, extras inclusive;
 * clicar numa etapa mostra os detalhes dela e permite levar a equipe até lá
 * ou, se for extra, removê-la. Avançar com obrigatórias pendentes cai no
 * mesmo diálogo da RN-01 do kanban.
 */
export default function JourneyCard({ detail, canManage, onChanged, onToast }: JourneyCardProps) {
  const { team, journey } = detail;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ target: ApiJourneyStage; blockers: ApiStageBlocker[] } | null>(null);
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  if (journey.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-card-border p-6 text-sm text-muted">
        Esta equipe ainda não tem jornada configurada.
      </div>
    );
  }

  const currentIndex = Math.max(0, journey.findIndex((stage) => stage.isCurrent));
  const current = journey[currentIndex];
  const previous = journey[currentIndex - 1];
  const next = journey[currentIndex + 1];
  const extras = journey.filter((stage) => stage.isExtra).length;

  const selected = journey.find((stage) => stage.id === selectedId) ?? current;
  const selectedIndex = journey.indexOf(selected);

  // Equipe encaminhada ao InovAMF ou excluída: a jornada fica só para leitura.
  const editable = canManage && team.isActive && team.journeyStatus !== "REFERRED";

  function select(stage: { id: string }) {
    setSelectedId(stage.id === current.id ? null : stage.id);
    setConfirmingRemoval(false);
  }

  /** Sem `force`, o backend recusa (409) se faltar obrigatória aprovada e devolve a lista. */
  async function moveTo(target: ApiJourneyStage, force = false, why?: string) {
    setBusy(true);
    try {
      const result = await api.changeStage(team.id, {
        toStageId: target.id,
        force,
        reason: why?.trim() ? why.trim() : undefined,
      });
      setPendingMove(null);
      setReason("");
      setSelectedId(null);
      onToast("ok", result.message);
      await onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.code === "STAGE_REQUIREMENTS_PENDING") {
        setPendingMove({
          target,
          blockers: (err.details?.pendingTasks as ApiStageBlocker[] | undefined) ?? [],
        });
        return;
      }
      onToast("erro", describeError(err, "Não foi possível mover a equipe."));
    } finally {
      setBusy(false);
    }
  }

  async function addStage(input: { name: string; description: string; afterStageId: string }) {
    setBusy(true);
    try {
      const result = await api.addStage(team.id, {
        name: input.name.trim(),
        description: input.description.trim() || undefined,
        afterStageId: input.afterStageId,
      });
      setAdding(false);
      setSelectedId(result.stageId);
      onToast("ok", `Etapa “${input.name.trim()}” incluída na jornada da equipe ${team.name}.`);
      await onChanged();
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível incluir a etapa."));
    } finally {
      setBusy(false);
    }
  }

  async function removeStage(stage: ApiJourneyStage) {
    setBusy(true);
    try {
      await api.removeStage(team.id, stage.id);
      setSelectedId(null);
      onToast("ok", `Etapa “${stage.name}” removida da jornada.`);
      await onChanged();
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível remover a etapa."));
    } finally {
      setConfirmingRemoval(false);
      setBusy(false);
    }
  }

  const arrowClass =
    "p-1.5 border border-input-border rounded-lg text-muted hover:bg-hover-bg disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div className="bg-card rounded-xl border border-card-border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Progresso da jornada</h2>
          <p className="text-xs text-muted-light mt-0.5">
            {extras > 0
              ? `${journey.length} etapas: as 6 padrão + ${extras} ${extras === 1 ? "extra" : "extras"} só desta equipe`
              : "Jornada padrão de 6 etapas"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editable && (
            <>
              <button
                type="button"
                onClick={() => setAdding((open) => !open)}
                aria-expanded={adding}
                className="inline-flex items-center gap-1.5 rounded-lg border border-input-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-hover-bg"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar etapa
              </button>
              <button
                type="button"
                onClick={() => previous && void moveTo(previous)}
                disabled={!previous || busy}
                title={previous ? `Voltar para: ${previous.name}` : "A equipe está na primeira etapa"}
                aria-label="Voltar para a etapa anterior"
                className={arrowClass}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => next && void moveTo(next)}
                disabled={!next || busy}
                title={next ? `Avançar para: ${next.name}` : "A equipe está na última etapa da jornada"}
                aria-label="Avançar para a próxima etapa"
                className={arrowClass}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          <JourneyStatusBadge status={team.journeyStatus} isActive={team.isActive} />
        </div>
      </div>

      <StagePipeline
        stages={journey}
        currentStage={currentIndex + 1}
        selectedId={selected.id}
        onSelect={select}
      />

      <div className="mt-4 bg-highlight-bg rounded-lg p-3">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <p className="min-w-0 flex-1 text-xs text-muted">
            <span className="font-semibold text-foreground">
              {journeyStageLabel(selected)} — {selected.name}:
            </span>{" "}
            {selected.description ?? "Sem descrição."}
          </p>
          <span className="shrink-0 text-[11px] font-medium text-muted-light">
            {selectedIndex === currentIndex
              ? "Etapa atual"
              : selectedIndex < currentIndex
                ? "Concluída"
                : "Ainda não iniciada"}
          </span>
        </div>

        {editable && selectedIndex !== currentIndex && !confirmingRemoval && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void moveTo(selected)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {selectedIndex > currentIndex ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
              {selectedIndex > currentIndex ? "Avançar a equipe até esta etapa" : "Voltar a equipe para esta etapa"}
            </button>
            {selected.isExtra && (
              <button
                type="button"
                onClick={() => setConfirmingRemoval(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md border border-input-border bg-card px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-hover-bg disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remover etapa
              </button>
            )}
          </div>
        )}

        {confirmingRemoval && selected.isExtra && (
          <div className="animate-fade-in mt-3 flex flex-wrap items-center gap-2 rounded-md border border-danger/30 bg-card p-2.5 text-xs">
            <span className="min-w-0 flex-1 text-foreground">
              Remover “{selected.name}” da jornada desta equipe?
            </span>
            <button
              type="button"
              onClick={() => setConfirmingRemoval(false)}
              className="px-2.5 py-1 text-muted hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void removeStage(selected)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-danger px-2.5 py-1 font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3 w-3 animate-spin" />}
              Remover
            </button>
          </div>
        )}

        {editable && selected.isExtra && selectedIndex === currentIndex && (
          <p className="mt-2 text-[11px] text-muted-light">
            A equipe está nesta etapa extra; para removê-la, mova a equipe antes.
          </p>
        )}
      </div>

      {editable && !adding && (
        <p className="mt-2 text-[11px] text-muted-light">
          Clique numa etapa para ver os detalhes, levar a equipe até ela ou remover uma etapa extra.
        </p>
      )}

      {adding && (
        <AddStageForm
          journey={journey}
          teamName={team.name}
          busy={busy}
          onCancel={() => setAdding(false)}
          onSubmit={addStage}
        />
      )}

      {pendingMove && (
        <ConfirmAdvanceDialog
          teamName={team.name}
          targetLabel={targetLabel(pendingMove.target)}
          blockers={pendingMove.blockers}
          reason={reason}
          onReasonChange={setReason}
          isSubmitting={busy}
          onCancel={() => {
            setPendingMove(null);
            setReason("");
          }}
          onConfirm={() => void moveTo(pendingMove.target, true, reason)}
        />
      )}
    </div>
  );
}

/**
 * Nova etapa só para esta equipe. Por padrão entra no fim da jornada; o
 * mentor pode encaixá-la depois de qualquer etapa.
 */
function AddStageForm({
  journey,
  teamName,
  busy,
  onCancel,
  onSubmit,
}: {
  journey: ApiJourneyStage[];
  teamName: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (input: { name: string; description: string; afterStageId: string }) => Promise<void>;
}) {
  const last = journey[journey.length - 1];
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [afterStageId, setAfterStageId] = useState(last.id);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const tooShort = name.trim().length < 3;

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!tooShort && !busy) void onSubmit({ name, description, afterStageId });
      }}
      className="animate-rise mt-4 rounded-lg border-2 border-dashed border-primary/30 bg-highlight-bg p-4"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Nova etapa na jornada</h3>
          <p className="mt-0.5 text-xs text-muted">
            Vale só para a equipe {teamName}; as demais continuam com as 6 etapas padrão.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Fechar"
          className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-light transition-colors hover:bg-hover-bg hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="new-stage-name" className="text-xs text-muted mb-1 block">
            Nome da etapa
          </label>
          <input
            id="new-stage-name"
            ref={nameRef}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            placeholder="Ex.: Validação com clientes"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="new-stage-description" className="text-xs text-muted mb-1 block">
            O que a equipe faz nesta etapa <span className="text-muted-light">(opcional)</span>
          </label>
          <textarea
            id="new-stage-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Ex.: Entrevistar ao menos 10 potenciais clientes e registrar os aprendizados."
            className={`${inputClass} resize-none`}
          />
        </div>
        <div>
          <label htmlFor="new-stage-position" className="text-xs text-muted mb-1 block">
            Posição na jornada
          </label>
          <select
            id="new-stage-position"
            value={afterStageId}
            onChange={(event) => setAfterStageId(event.target.value)}
            className={inputClass}
          >
            {journey.map((stage) => (
              <option key={stage.id} value={stage.id}>
                Depois de {journeyStageLabel(stage)} — {stage.name}
                {stage.id === last.id ? " (fim da jornada)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted hover:text-foreground">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={tooShort || busy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Adicionar etapa
          </button>
        </div>
      </div>
    </form>
  );
}
