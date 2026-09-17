import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Calendar, Clock } from "lucide-react";

interface DueChipProps {
  /** Data no formato ISO (AAAA-MM-DD). */
  dueDate: string;
  /** Tarefa já entregue/aprovada: mostra só a data, sem urgência. */
  done?: boolean;
}

/**
 * Prazo em linguagem de gente — "Vence em 2 dias", "Atrasada há 3 dias" —
 * com a cor subindo conforme aperta. "Prazo: 2026-08-25" obriga o aluno a
 * fazer conta; isto aqui faz a conta por ele.
 */
export default function DueChip({ dueDate, done = false }: DueChipProps) {
  const date = parseISO(dueDate);
  const short = format(date, "d MMM", { locale: ptBR });

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-light">
        <Calendar className="h-3 w-3" />
        {short}
      </span>
    );
  }

  const days = differenceInCalendarDays(date, new Date());

  let label: string;
  let tone: string;
  let Icon = Calendar;

  if (days < 0) {
    const n = Math.abs(days);
    label = `Atrasada há ${n} ${n === 1 ? "dia" : "dias"}`;
    tone = "bg-red-500/15 text-red-700 dark:text-red-400";
    Icon = AlertTriangle;
  } else if (days === 0) {
    label = "Vence hoje";
    tone = "bg-red-500/15 text-red-700 dark:text-red-400";
    Icon = Clock;
  } else if (days <= 3) {
    label = `Vence em ${days} ${days === 1 ? "dia" : "dias"}`;
    tone = "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    Icon = Clock;
  } else if (days <= 7) {
    label = `Vence em ${days} dias`;
    tone = "bg-blue-500/15 text-blue-700 dark:text-blue-400";
  } else {
    label = `Prazo ${short}`;
    tone = "bg-badge-muted-bg text-badge-muted-text";
  }

  return (
    <span
      title={`Prazo: ${format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
