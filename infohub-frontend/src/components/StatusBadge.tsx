import { TaskStatus } from "@/lib/types";

const STATUS_CONFIG: Record<TaskStatus, { label: string; classes: string }> = {
  pendente: { label: "Pendente", classes: "bg-gray-100 text-gray-700" },
  em_andamento: { label: "Em andamento", classes: "bg-blue-100 text-blue-700" },
  entregue: { label: "Entregue", classes: "bg-purple-100 text-purple-700" },
  atrasada: { label: "Atrasada", classes: "bg-red-100 text-red-700" },
  aprovada: { label: "Aprovada", classes: "bg-green-100 text-green-700" },
  reprovada: { label: "Ajustar", classes: "bg-orange-100 text-orange-700" },
};

export default function StatusBadge({ status }: { status: TaskStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes}`}>
      {config.label}
    </span>
  );
}

export function TeamStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    ativa: { label: "Ativa", classes: "bg-blue-100 text-blue-700" },
    pronta_inovamf: { label: "Pronta para InovAMF", classes: "bg-green-100 text-green-700" },
    encaminhada: { label: "Encaminhada ao InovAMF", classes: "bg-emerald-100 text-emerald-700" },
    inativa: { label: "Inativa", classes: "bg-gray-100 text-gray-500" },
  };
  const c = config[status] ?? config.ativa;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.classes}`}>
      {c.label}
    </span>
  );
}
