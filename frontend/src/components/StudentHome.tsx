"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, Crown, FileText, Lightbulb, Rocket, Trash2, UserPlus, Users } from "lucide-react";
import AddMemberForm from "./AddMemberForm";
import ConfirmDialog from "./ConfirmDialog";
import DueChip from "./DueChip";
import FinalDeliverablesCard from "./FinalDeliverablesCard";
import Header from "./Header";
import { TeamDetailSkeleton } from "./Skeleton";
import StagePipeline from "./StagePipeline";
import { JourneyStatusBadge, TaskStatusBadge } from "./StatusBadge";
import { NoTeam } from "./StudentTasks";
import Toast, { type ToastMessage } from "./Toast";
import { api, describeError } from "@/lib/api";
import {
  IDEA_STAGE_LABELS,
  currentTeamOf,
  journeyStageLabel,
  type ApiTask,
  type ApiTeamDetail,
  type ApiTeamMember,
} from "@/lib/api-types";
import { formatDate } from "@/lib/format";
import { useRequireSession, useSession } from "@/lib/session";
import { STAGE_DELIVERABLES, type JourneyStage } from "@/lib/types";

type ShowToast = (kind: ToastMessage["kind"], text: string) => void;

const OPEN_STATUSES = new Set(["PENDING", "IN_PROGRESS", "OVERDUE", "REJECTED"]);

/**
 * "Minha Jornada" do aluno — a mesma tela para o líder (/aluno) e para os
 * integrantes (/integrante), com os dados reais da equipe: a jornada (6
 * etapas + extras), o que fazer agora, a equipe e os entregáveis finais. O
 * líder também inclui e remove colegas e pode passar a liderança (Q1).
 */
export default function StudentHome({ tasksHref }: { tasksHref: string }) {
  const { user, loading } = useRequireSession(["STUDENT"]);
  const { refresh } = useSession();
  const team = user ? currentTeamOf(user) : null;
  const teamId = team?.id ?? null;

  const [detail, setDetail] = useState<ApiTeamDetail | null>(null);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const load = useCallback(() => {
    if (!teamId) return Promise.resolve();
    return Promise.all([api.team(teamId), api.tasks({ teamId })]).then(
      ([teamData, taskData]) => {
        setDetail(teamData);
        setTasks(taskData.data);
        setError(null);
      },
      (err: unknown) => setError(describeError(err, "Não foi possível carregar a sua equipe. A API está no ar?")),
    );
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  const showToast: ShowToast = useCallback((kind, text) => setToast({ kind, text }), []);

  if (loading || !user) return <TeamDetailSkeleton />;

  if (!team) {
    return (
      <div>
        <Header title="Minha Jornada" userName={user.name} />
        <NoTeam />
      </div>
    );
  }

  if (!detail) {
    if (!error) return <TeamDetailSkeleton />;
    return (
      <div>
        <Header title="Minha Jornada" userName={user.name} />
        <div className="p-6">
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 text-sm text-danger">
            {error}{" "}
            <button type="button" onClick={() => void load()} className="font-medium underline">
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { team: card, journey, members } = detail;
  const isLeader = card.leader?.id === user.id;
  const currentIndex = Math.max(0, journey.findIndex((stage) => stage.isCurrent));
  const current = journey[currentIndex];
  const pending = tasks.filter((task) => OPEN_STATUSES.has(task.status)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const inReview = tasks.filter((task) => task.status === "SUBMITTED").length;
  const approved = tasks.filter((task) => task.status === "APPROVED").length;
  const nextDue = pending[0];
  const deliverable = current?.number ? STAGE_DELIVERABLES[current.number as JourneyStage] : null;

  return (
    <div>
      <Header
        title="Minha Jornada"
        userName={user.name}
        subtitle={isLeader ? `Líder da equipe ${card.name}` : `Integrante da equipe ${card.name}`}
      />

      <div className="p-6">
        {card.journeyStatus === "READY_FOR_INOVAMF" && (
          <Banner icon={<Rocket className="w-5 h-5 text-success" />}>
            Todos os entregáveis foram aprovados: a equipe está <strong>pronta para o InovAMF</strong>. A coordenação
            faz o encaminhamento.
          </Banner>
        )}
        {card.journeyStatus === "REFERRED" && (
          <Banner icon={<Rocket className="w-5 h-5 text-success" />}>
            A equipe foi <strong>encaminhada ao InovAMF</strong>
            {card.referredAt ? ` em ${formatDate(card.referredAt)}` : ""}. Parabéns!
          </Banner>
        )}

        <div className="animate-rise bg-card rounded-xl border border-card-border p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <h2 className="text-base font-semibold text-foreground">Progresso da jornada</h2>
            <JourneyStatusBadge status={card.journeyStatus} isActive={card.isActive} />
          </div>
          <StagePipeline stages={journey} currentStage={currentIndex + 1} showProgress />
          {current && (
            <div className="mt-4 bg-highlight-bg rounded-lg p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary mb-1">
                  {journeyStageLabel(current)} — {current.name}
                </p>
                {current.description && <p className="text-sm text-muted">{current.description}</p>}
                {deliverable && <p className="text-xs text-muted-light mt-2">Entregável esperado: {deliverable}</p>}
              </div>
              {nextDue && (
                <div className="shrink-0 sm:text-right">
                  <p className="text-xs text-muted-light mb-1">Próximo prazo</p>
                  <DueChip dueDate={nextDue.dueDate} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <div className="bg-card rounded-xl border border-card-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  O que fazer agora ({pending.length})
                </h3>
                <Link href={tasksHref} className="text-sm text-primary hover:text-primary-dark">
                  Ver todas
                </Link>
              </div>
              {pending.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
                  <p className="text-sm text-muted">Nenhuma tarefa pendente — tudo em dia!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.slice(0, 5).map((task, index) => (
                    <div
                      key={task.id}
                      style={{ animationDelay: `${120 + index * 60}ms` }}
                      className="animate-rise border border-card-border rounded-lg p-4 transition-[border-color,box-shadow] duration-150 hover:border-primary/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-sm font-medium text-foreground">{task.title}</h4>
                          {task.description && <p className="text-xs text-muted mt-0.5 line-clamp-2">{task.description}</p>}
                        </div>
                        <TaskStatusBadge status={task.status} />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                        <DueChip dueDate={task.dueDate} />
                        <Link
                          href={tasksHref}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs rounded-md hover:bg-primary-dark"
                        >
                          <FileText className="w-3 h-3" /> {task.status === "REJECTED" ? "Ver ajustes" : "Enviar entrega"}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(inReview > 0 || approved > 0) && (
                <p className="mt-4 text-xs text-muted-light">
                  {inReview > 0 && `${inReview} em avaliação pelo mentor`}
                  {inReview > 0 && approved > 0 && " · "}
                  {approved > 0 && `${approved} ${approved === 1 ? "aprovada" : "aprovadas"}`}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-card-border p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" /> Sobre o projeto
              </h3>
              <div className="space-y-3 text-sm">
                <Info label="Nome" value={card.name} strong />
                <Info label="Descrição" value={card.description} small />
                <Info label="Área" value={card.category.name} />
                <Info label="Estágio" value={IDEA_STAGE_LABELS[card.ideaStage]} />
                <Info
                  label="Mentoria"
                  value={card.mentors.length ? card.mentors.map((mentor) => mentor.name).join(", ") : "A coordenação vai indicar um mentor"}
                />
              </div>
            </div>

            <TeamMembersCard
              teamId={card.id}
              teamActive={card.isActive}
              members={members}
              currentUserId={user.id}
              isLeader={isLeader}
              onChanged={load}
              onLeadershipChanged={async () => {
                // Deixou de ser líder: a sessão muda e a área certa passa a ser /integrante.
                await refresh();
              }}
              onToast={showToast}
            />

            <FinalDeliverablesCard deliverables={detail.finalDeliverables} />
          </div>
        </div>
      </div>

      {toast && <Toast key={toast.text} kind={toast.kind} text={toast.text} onClose={() => setToast(null)} />}
    </div>
  );
}

function Banner({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="animate-rise mb-6 flex items-start gap-3 rounded-xl border border-green-500/25 bg-green-500/10 p-4 text-sm text-foreground">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p>{children}</p>
    </div>
  );
}

function Info({ label, value, strong, small }: { label: string; value: string; strong?: boolean; small?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-light mb-0.5">{label}</p>
      <p className={small ? "text-xs text-muted whitespace-pre-line" : strong ? "font-medium text-foreground" : "text-foreground"}>
        {value}
      </p>
    </div>
  );
}

/**
 * Integrantes da equipe. O líder inclui colegas (a conta nova recebe o link
 * de ativação por e-mail), remove quem saiu e pode passar a liderança.
 */
function TeamMembersCard({
  teamId,
  teamActive,
  members,
  currentUserId,
  isLeader,
  onChanged,
  onLeadershipChanged,
  onToast,
}: {
  teamId: string;
  teamActive: boolean;
  members: ApiTeamMember[];
  currentUserId: string;
  isLeader: boolean;
  onChanged: () => Promise<void>;
  onLeadershipChanged: () => Promise<void>;
  onToast: ShowToast;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "remove" | "promote"; member: ApiTeamMember } | null>(null);
  const [busy, setBusy] = useState(false);
  const canManage = isLeader && teamActive;

  async function confirmAction() {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "remove") {
        await api.removeMember(teamId, confirm.member.id);
        onToast("ok", `${confirm.member.name} saiu da equipe.`);
        setConfirm(null);
        await onChanged();
      } else {
        await api.promoteLeader(teamId, confirm.member.id);
        setConfirm(null);
        onToast("ok", `${confirm.member.name} agora é o líder da equipe.`);
        await onLeadershipChanged();
        router.replace("/integrante");
      }
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível concluir a ação."));
    } finally {
      setBusy(false);
    }
  }

  const sorted = [...members].sort((a, b) => (a.role === "LEADER" ? -1 : b.role === "LEADER" ? 1 : a.name.localeCompare(b.name)));

  return (
    <div className="bg-card rounded-xl border border-card-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4" /> Equipe ({members.length})
        </h3>
        {canManage && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark"
          >
            <UserPlus className="w-3.5 h-3.5" /> Adicionar
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {sorted.map((member) => (
          <li key={member.id} className="group flex items-center gap-2">
            <div
              className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-medium ${
                member.role === "LEADER" ? "bg-primary text-white" : "bg-badge-muted-bg text-muted"
              }`}
            >
              {member.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground truncate">
                {member.name}{" "}
                {member.role === "LEADER" && <span className="text-xs text-primary">(líder)</span>}
                {member.id === currentUserId && <span className="text-xs text-muted-light"> (você)</span>}
              </p>
              <p className="text-xs text-muted-light truncate">{member.course ?? member.email}</p>
            </div>
            {canManage && member.role !== "LEADER" && (
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setConfirm({ kind: "promote", member })}
                  title={`Passar a liderança para ${member.name}`}
                  aria-label={`Passar a liderança para ${member.name}`}
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
          teamId={teamId}
          onCancel={() => setAdding(false)}
          onAdded={async (message) => {
            setAdding(false);
            onToast("ok", message);
            await onChanged();
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.kind === "remove" ? "Remover da equipe?" : "Passar a liderança?"}
          description={
            confirm.kind === "remove" ? (
              <>
                <strong>{confirm.member.name}</strong> deixa de ver as tarefas da equipe. A conta dele continua existindo
                e pode entrar em outra equipe.
              </>
            ) : (
              <>
                <strong>{confirm.member.name}</strong> passa a ser o líder (só pode haver um). Você continua na equipe
                como integrante.
              </>
            )
          }
          confirmLabel={confirm.kind === "remove" ? "Remover" : "Passar a liderança"}
          tone={confirm.kind === "remove" ? "danger" : "primary"}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void confirmAction()}
        />
      )}
    </div>
  );
}
