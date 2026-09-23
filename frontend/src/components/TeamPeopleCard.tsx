"use client";

import { useEffect, useState } from "react";
import { Crown, GraduationCap, Loader2, Mail, Phone, Plus, Trash2, UserPlus, Users, X } from "lucide-react";
import AddMemberForm from "./AddMemberForm";
import ConfirmDialog from "./ConfirmDialog";
import { api, describeError } from "@/lib/api";
import type { ApiTeamCard, ApiTeamMember } from "@/lib/api-types";

type ShowToast = (kind: "ok" | "erro", text: string) => void;

/**
 * Pessoas da equipe no detalhe do admin/mentor (RF-08): o líder com os
 * contatos, os integrantes — incluir, remover, passar a liderança (Q1: um
 * líder só) — e, para o admin, a mentoria (atribuir/remover mentor).
 */
export default function TeamPeopleCard({
  team,
  members,
  isAdmin,
  editable,
  onChanged,
  onToast,
}: {
  team: ApiTeamCard;
  members: ApiTeamMember[];
  isAdmin: boolean;
  /** Equipe ativa: dá para mexer nas pessoas. */
  editable: boolean;
  onChanged: () => Promise<void>;
  onToast: ShowToast;
}) {
  const leader = members.find((member) => member.role === "LEADER");
  const others = members.filter((member) => member.role !== "LEADER");
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "remove" | "promote"; member: ApiTeamMember } | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmAction() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "remove") {
        await api.removeMember(team.id, confirm.member.id);
        onToast("ok", `${confirm.member.name} saiu da equipe.`);
      } else {
        const result = await api.promoteLeader(team.id, confirm.member.id);
        onToast("ok", `${result.message} ${confirm.member.name} agora lidera a equipe.`);
      }
      setConfirm(null);
      await onChanged();
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível concluir a ação."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {leader && (
        <div className="bg-card rounded-xl border border-card-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Líder da equipe</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium">
                {leader.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{leader.name}</p>
                <p className="text-xs text-muted">
                  {[leader.course, leader.semester].filter(Boolean).join(" · ") || "Curso não informado"}
                </p>
              </div>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted break-all">
              <Mail className="w-3.5 h-3.5 shrink-0 text-muted-light" /> {leader.email}
            </p>
            {leader.phone && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Phone className="w-3.5 h-3.5 text-muted-light" /> {leader.phone}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-card-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4" /> Integrantes ({others.length})
          </h3>
          {editable && !adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-primary hover:text-primary-dark"
            >
              <UserPlus className="w-3.5 h-3.5" /> Adicionar
            </button>
          )}
        </div>
        {others.length === 0 && !adding && <p className="text-xs text-muted-light">Só o líder está na equipe.</p>}
        <ul className="space-y-2">
          {others.map((member) => (
            <li key={member.id} className="flex items-center gap-3">
              <div className="w-8 h-8 shrink-0 bg-badge-muted-bg rounded-full flex items-center justify-center text-muted text-xs font-medium">
                {member.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground truncate">{member.name}</p>
                <p className="text-xs text-muted-light truncate">{member.course ?? member.email}</p>
              </div>
              {editable && (
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setConfirm({ kind: "promote", member })}
                    title={`Tornar ${member.name} o líder`}
                    aria-label={`Tornar ${member.name} o líder`}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-light hover:bg-hover-bg hover:text-primary"
                  >
                    <Crown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm({ kind: "remove", member })}
                    title={`Remover ${member.name} da equipe`}
                    aria-label={`Remover ${member.name} da equipe`}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-light hover:bg-hover-bg hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {adding && (
          <AddMemberForm
            teamId={team.id}
            onCancel={() => setAdding(false)}
            onAdded={async (message) => {
              setAdding(false);
              onToast("ok", message);
              await onChanged();
            }}
          />
        )}
      </div>

      <MentorsCard team={team} isAdmin={isAdmin} editable={editable} onChanged={onChanged} onToast={onToast} />

      {confirm && (
        <ConfirmDialog
          title={confirm.kind === "remove" ? "Remover da equipe?" : "Trocar o líder?"}
          description={
            confirm.kind === "remove" ? (
              <>
                <strong>{confirm.member.name}</strong> sai da equipe {team.name}. A conta continua existindo e pode entrar
                em outra equipe.
              </>
            ) : (
              <>
                <strong>{confirm.member.name}</strong> passa a ser o único líder da equipe {team.name}; o líder atual
                continua como integrante.
              </>
            )
          }
          confirmLabel={confirm.kind === "remove" ? "Remover" : "Trocar o líder"}
          tone={confirm.kind === "remove" ? "danger" : "primary"}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void confirmAction()}
        />
      )}
    </>
  );
}

/** Mentoria da equipe: o admin atribui e remove mentores; o mentor só vê quem acompanha. */
function MentorsCard({
  team,
  isAdmin,
  editable,
  onChanged,
  onToast,
}: {
  team: ApiTeamCard;
  isAdmin: boolean;
  editable: boolean;
  onChanged: () => Promise<void>;
  onToast: ShowToast;
}) {
  const [options, setOptions] = useState<Array<{ id: string; name: string }> | null>(null);
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const canEdit = isAdmin && editable;

  useEffect(() => {
    if (!picking || options) return;
    let cancelled = false;
    api.mentors().then(
      (result) => {
        if (!cancelled) setOptions(result.data);
      },
      (err: unknown) => {
        if (!cancelled) onToast("erro", describeError(err, "Não foi possível carregar os mentores."));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [picking, options, onToast]);

  const available = (options ?? []).filter((option) => !team.mentors.some((mentor) => mentor.id === option.id));

  async function assign() {
    if (!selected) return;
    setBusyId(selected);
    try {
      const result = await api.assignMentor(team.id, selected);
      onToast("ok", result.message);
      setPicking(false);
      setSelected("");
      await onChanged();
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível atribuir o mentor."));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(mentorId: string, name: string) {
    setBusyId(mentorId);
    try {
      await api.removeMentor(team.id, mentorId);
      onToast("ok", `${name} deixou de acompanhar a equipe.`);
      await onChanged();
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível remover o mentor."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-card rounded-xl border border-card-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GraduationCap className="w-4 h-4" /> Mentoria
        </h3>
        {canEdit && !picking && (
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-primary hover:text-primary-dark"
          >
            <Plus className="w-3.5 h-3.5" /> Atribuir
          </button>
        )}
      </div>
      {team.mentors.length === 0 ? (
        <p className="text-xs text-muted-light">Nenhum mentor atribuído ainda.</p>
      ) : (
        <ul className="space-y-2">
          {team.mentors.map((mentor) => (
            <li key={mentor.id} className="flex items-center justify-between gap-2 text-sm text-foreground">
              <span className="truncate">{mentor.name}</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void remove(mentor.id, mentor.name)}
                  disabled={busyId === mentor.id}
                  title={`Remover ${mentor.name} da mentoria`}
                  aria-label={`Remover ${mentor.name} da mentoria`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-light hover:bg-hover-bg hover:text-danger disabled:opacity-40"
                >
                  {busyId === mentor.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {picking && (
        <div className="animate-rise mt-3 flex gap-2">
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            aria-label="Mentor"
            className="min-w-0 flex-1 px-3 py-1.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">{options ? (available.length ? "Escolha o mentor..." : "Todos já acompanham") : "Carregando..."}</option>
            {available.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void assign()}
            disabled={!selected || busyId !== null}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-40"
          >
            {busyId === selected && selected ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Atribuir
          </button>
          <button
            type="button"
            onClick={() => {
              setPicking(false);
              setSelected("");
            }}
            aria-label="Cancelar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-light hover:bg-hover-bg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
