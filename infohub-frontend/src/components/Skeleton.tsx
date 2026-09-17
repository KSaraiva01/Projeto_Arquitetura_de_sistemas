/**
 * Placeholders de carregamento com o brilho do `.skeleton` do globals.css.
 * Reproduzem a silhueta do que vai aparecer, para a tela não "pular".
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function KpiSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-card-border bg-card p-4">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-6 w-12" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-card-border bg-card p-4">
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex justify-between pt-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/** Silhueta do quadro de 6 colunas enquanto `GET /teams/board` responde. */
export function BoardSkeleton() {
  return (
    <div role="status" aria-label="Carregando o quadro" className="flex gap-4 overflow-hidden pb-4">
      {[2, 1, 2, 1, 1, 1].map((cards, column) => (
        <div key={column} className="min-w-[280px] flex-1">
          <div className="flex items-center gap-2 rounded-t-xl bg-kanban-col-bg px-4 py-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="min-h-[220px] space-y-3 rounded-b-xl border border-kanban-col-border bg-kanban-col-bg/50 p-3">
            {Array.from({ length: cards }).map((_, card) => (
              <CardSkeleton key={card} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Página inteira do dashboard enquanto a sessão é reconstruída. */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="p-6">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
      </div>
      <BoardSkeleton />
    </div>
  );
}
