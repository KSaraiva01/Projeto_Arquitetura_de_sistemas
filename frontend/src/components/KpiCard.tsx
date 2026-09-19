"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Anima um número de 0 até `target` em ~900ms, desacelerando no fim.
 * Quando o alvo muda (o quadro recarregou), parte do valor atual, não do
 * zero, para o número não "piscar". Com reduced-motion vai direto ao alvo.
 */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;

    function tick(now: number) {
      const t = reduce ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (target - from) * eased);
      setValue(current);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  bg: string;
  /** Posição na fileira, para o escalonamento da entrada (60ms cada). */
  index?: number;
  /** Quando informado, o cartão vira um botão que aplica um filtro. */
  onClick?: () => void;
  /** Filtro deste cartão está aplicado no quadro abaixo. */
  active?: boolean;
}

export default function KpiCard({
  icon,
  label,
  value,
  bg,
  index = 0,
  onClick,
  active = false,
}: KpiCardProps) {
  const shown = useCountUp(value);

  const className = `animate-rise relative flex w-full items-center gap-4 rounded-xl border bg-card p-4 text-left transition-[transform,box-shadow,border-color] duration-150 ${
    active
      ? "border-primary/40 shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_10%,transparent)]"
      : "border-card-border"
  } ${
    onClick
      ? "cursor-pointer hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_6px_16px_-6px_rgba(17,24,39,0.15)]"
      : ""
  }`;

  const content = (
    <>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums text-foreground">{shown}</p>
        <p className="truncate text-xs text-muted">{label}</p>
      </div>
      {active && (
        <span className="absolute right-3 top-2.5 rounded-full bg-primary-light px-2 text-[11px] font-medium leading-4 text-primary">
          filtrando
        </span>
      )}
    </>
  );

  const style = { animationDelay: `${index * 60}ms` };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        style={style}
        className={className}
      >
        {content}
      </button>
    );
  }

  return (
    <div style={style} className={className}>
      {content}
    </div>
  );
}
