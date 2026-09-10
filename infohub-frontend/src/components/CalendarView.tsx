"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import {
  TASK_STATUS_LABELS,
  type ApiCalendar,
  type ApiCalendarEvent,
  type ApiTaskStatus,
} from "@/lib/api-types";

/** Cor de cada status, usada nas bolinhas e chips do calendário. */
const STATUS_STYLES: Record<ApiTaskStatus, { dot: string; chip: string }> = {
  PENDING: { dot: "bg-muted-light", chip: "bg-badge-muted-bg text-badge-muted-text" },
  IN_PROGRESS: { dot: "bg-secondary", chip: "bg-secondary/15 text-secondary-dark" },
  SUBMITTED: { dot: "bg-blue-500", chip: "bg-blue-500/15 text-blue-600" },
  OVERDUE: { dot: "bg-danger", chip: "bg-danger/15 text-danger" },
  APPROVED: { dot: "bg-success", chip: "bg-success/15 text-success" },
  REJECTED: { dot: "bg-warning", chip: "bg-warning/20 text-warning" },
};

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

interface CalendarViewProps {
  /** Quando true, mostra o nome da equipe em cada evento (admin e mentor). */
  showTeamName?: boolean;
}

/**
 * Calendário de atividades e prazos.
 *
 * Busca no backend o intervalo da grade visível — que inclui os dias do mês
 * anterior e do seguinte que completam as semanas — e não só o mês fechado,
 * para as bordas da grade não aparecerem vazias por engano.
 *
 * O escopo é resolvido pelo backend: administrador vê tudo, mentor vê as
 * equipes que acompanha, aluno vê apenas a própria equipe.
 */
export default function CalendarView({ showTeamName = true }: CalendarViewProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [data, setData] = useState<ApiCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeReminders, setIncludeReminders] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const rangeFrom = gridDays[0] ? toIsoDate(gridDays[0]) : "";
  const rangeTo = gridDays.at(-1) ? toIsoDate(gridDays.at(-1)!) : "";

  const load = useCallback(async () => {
    if (!rangeFrom || !rangeTo) return;

    try {
      const resultado = await api.calendar({
        from: rangeFrom,
        to: rangeTo,
        includeReminders,
      });
      // Idem KanbanBoard: os dados novos e a limpeza do erro entram juntos.
      setData(resultado);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o calendário. A API está no ar?",
      );
    } finally {
      setLoading(false);
    }
  }, [rangeFrom, rangeTo, includeReminders]);

  useEffect(() => {
    void load();
  }, [load]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ApiCalendarEvent[]>();
    for (const day of data?.days ?? []) {
      map.set(day.date, day.events);
    }
    return map;
  }, [data]);

  const selectedEvents = selectedDate
    ? (eventsByDay.get(selectedDate) ?? [])
    : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<CalendarDays className="w-5 h-5 text-blue-500" />}
          bg="bg-blue-500/10"
          label="Prazos no período"
          value={data?.summary.total ?? 0}
        />
        <SummaryCard
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          bg="bg-red-500/10"
          label="Atrasadas"
          value={data?.summary.overdue ?? 0}
        />
        <SummaryCard
          icon={<Clock className="w-5 h-5 text-amber-500" />}
          bg="bg-amber-500/10"
          label="Em aberto"
          value={data?.summary.pending ?? 0}
        />
        <SummaryCard
          icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
          bg="bg-green-500/10"
          label="Aprovadas"
          value={data?.summary.approved ?? 0}
        />
      </div>

      <div className="bg-card rounded-xl border border-card-border overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-b border-card-border">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonth((current) => subMonths(current, 1))}
              aria-label="Mês anterior"
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-hover-bg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base font-semibold text-foreground first-letter:uppercase min-w-[170px] text-center">
              {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
            </h2>
            <button
              type="button"
              onClick={() => setMonth((current) => addMonths(current, 1))}
              aria-label="Próximo mês"
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-hover-bg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMonth(startOfMonth(new Date()));
                setSelectedDate(toIsoDate(new Date()));
              }}
              className="ml-1 px-3 py-1.5 text-xs font-medium border border-card-border rounded-lg text-muted hover:text-foreground hover:bg-hover-bg transition-colors"
            >
              Hoje
            </button>
            {loading && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-light ml-1" />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={includeReminders}
              onChange={(event) => setIncludeReminders(event.target.checked)}
              className="rounded border-input-border"
            />
            <Bell className="w-3.5 h-3.5" />
            Mostrar lembretes
          </label>
        </div>

        {error ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-danger mx-auto mb-3" />
            <p className="text-sm text-foreground">{error}</p>
            <button
              onClick={() => void load()}
              className="mt-3 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 border-b border-divider">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-light"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {gridDays.map((day) => {
                const iso = toIsoDate(day);
                const dayEvents = eventsByDay.get(iso) ?? [];
                const inMonth = isSameMonth(day, month);
                const selected = selectedDate === iso;

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDate(selected ? null : iso)}
                    className={`min-h-[104px] text-left p-2 border-b border-r border-divider transition-colors ${
                      inMonth ? "bg-card" : "bg-hover-bg/40"
                    } ${selected ? "ring-2 ring-inset ring-primary" : "hover:bg-hover-bg"}`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mb-1 ${
                        isToday(day)
                          ? "bg-primary text-white font-bold"
                          : inMonth
                            ? "text-foreground"
                            : "text-muted-light"
                      }`}
                    >
                      {format(day, "d")}
                    </span>

                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event, index) => (
                        <EventChip
                          key={`${event.kind}-${event.taskId}-${index}`}
                          event={event}
                          showTeamName={showTeamName}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="block text-[10px] text-muted-light pl-0.5">
                          +{dayEvents.length - 3} mais
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Legend />

      {selectedDate && (
        <div className="bg-card rounded-xl border border-card-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 first-letter:uppercase">
            {format(parseISO(selectedDate), "EEEE, d 'de' MMMM", {
              locale: ptBR,
            })}
          </h3>

          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma atividade neste dia.</p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((event, index) => (
                <li
                  key={`${event.kind}-${event.taskId}-${index}`}
                  className="flex items-start justify-between gap-4 p-3 rounded-lg bg-hover-bg"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {event.kind === "REMINDER" ? (
                        <Bell className="w-3.5 h-3.5 text-secondary shrink-0" />
                      ) : (
                        <CalendarDays className="w-3.5 h-3.5 text-muted shrink-0" />
                      )}
                      <span className="text-sm font-medium text-foreground truncate">
                        {event.title}
                      </span>
                      {event.isMandatory && (
                        <span className="text-[10px] font-semibold uppercase text-primary shrink-0">
                          obrigatória
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {event.kind === "REMINDER"
                        ? `Lembrete${event.reminderSent ? " (já enviado)" : " (a enviar)"}`
                        : "Prazo de entrega"}
                      {" · "}
                      Etapa {event.stage} – {event.stageName}
                      {showTeamName && ` · ${event.teamName}`}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-medium px-2 py-1 rounded-full shrink-0 ${STATUS_STYLES[event.status].chip}`}
                  >
                    {TASK_STATUS_LABELS[event.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function EventChip({
  event,
  showTeamName,
}: {
  event: ApiCalendarEvent;
  showTeamName: boolean;
}) {
  const style = STATUS_STYLES[event.status];

  return (
    <span
      title={`${event.kind === "REMINDER" ? "Lembrete" : "Prazo"}: ${event.title} — ${event.teamName}`}
      className={`flex items-center gap-1 text-[10px] leading-tight px-1.5 py-0.5 rounded ${
        event.kind === "REMINDER"
          ? "bg-transparent text-muted border border-dashed border-divider"
          : style.chip
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      <span className="truncate">
        {showTeamName ? `${event.teamName} · ${event.title}` : event.title}
      </span>
    </span>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted px-1">
      <span className="font-medium text-foreground">Legenda:</span>
      {(
        [
          ["PENDING", "Pendente"],
          ["SUBMITTED", "Entregue"],
          ["OVERDUE", "Atrasada"],
          ["APPROVED", "Aprovada"],
          ["REJECTED", "Ajustar"],
        ] as Array<[ApiTaskStatus, string]>
      ).map(([status, label]) => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[status].dot}`} />
          {label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="w-3 h-2 rounded border border-dashed border-divider" />
        Lembrete automático
      </span>
    </div>
  );
}

function SummaryCard({
  icon,
  bg,
  label,
  value,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-card rounded-xl border border-card-border p-4 flex items-center gap-4">
      <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}
