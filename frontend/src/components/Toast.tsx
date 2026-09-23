"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, X } from "lucide-react";

export interface ToastMessage {
  kind: "ok" | "erro";
  text: string;
}

/**
 * Aviso no canto: entra da direita, mostra quanto tempo falta na barra de
 * baixo, pausa enquanto o mouse está em cima e sai para baixo. Fecha no X
 * ou sozinho em 5s.
 */
export default function Toast({
  kind,
  text,
  onClose,
}: ToastMessage & { onClose: () => void }) {
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const remaining = useRef(5000);
  const startedAt = useRef(0);

  const dismiss = useCallback(() => {
    setLeaving(true);
    window.setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (paused || leaving) return;
    startedAt.current = performance.now();
    const timer = window.setTimeout(dismiss, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (performance.now() - startedAt.current));
    };
  }, [paused, leaving, dismiss]);

  const isOk = kind === "ok";

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`fixed bottom-6 right-6 z-50 flex w-[360px] max-w-[calc(100vw-3rem)] items-start gap-2.5 overflow-hidden rounded-[10px] border border-card-border border-l-4 bg-card py-3 pl-3.5 pr-3 shadow-lg ${
        isOk ? "border-l-success" : "border-l-danger"
      } ${leaving ? "animate-toast-out" : "animate-toast-in"}`}
    >
      {isOk ? (
        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
      ) : (
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
      )}
      <p className="flex-1 text-sm text-foreground">{text}</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar aviso"
        className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-light transition-colors hover:bg-hover-bg hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-0 h-[3px] w-full origin-left ${isOk ? "bg-success/35" : "bg-danger/35"}`}
        style={{
          // A barra encolhe de 1 para 0 no mesmo tempo do aviso.
          animation: "toast-bar 5s linear forwards",
          animationPlayState: paused ? "paused" : "running",
        }}
      />
    </div>
  );
}
