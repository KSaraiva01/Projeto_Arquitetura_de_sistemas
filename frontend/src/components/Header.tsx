"use client";

import { Menu } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useShell } from "./AppShell";

interface HeaderProps {
  title: string;
  userName: string;
  subtitle?: string;
}

/**
 * Cabeçalho das páginas logadas.
 *
 * A busca e o sino que ficavam aqui não faziam nada — eram só uma promessa
 * na tela. Saem até existir o que buscar e o que notificar; quando houver,
 * voltam ligados a dados de verdade.
 */
export default function Header({ title, userName, subtitle }: HeaderProps) {
  const { openDrawer } = useShell();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-card-border bg-card/90 px-4 py-3 backdrop-blur-md md:px-6 md:py-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={openDrawer}
          aria-label="Abrir menu"
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-hover-bg md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-foreground md:text-xl">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-xs text-muted md:text-sm">{subtitle}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        <div className="flex items-center gap-3 border-l border-divider pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
            {userName.charAt(0)}
          </div>
          <span className="hidden text-sm font-medium text-foreground sm:block">{userName}</span>
        </div>
      </div>
    </header>
  );
}
