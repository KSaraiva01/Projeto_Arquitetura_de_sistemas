"use client";

import { Bell, Search } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

interface HeaderProps {
  title: string;
  userName: string;
  subtitle?: string;
}

export default function Header({ title, userName, subtitle }: HeaderProps) {
  return (
    <header className="bg-card border-b border-card-border px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-light" />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-9 pr-4 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground w-64"
          />
        </div>
        <ThemeToggle />
        <button className="relative p-2 text-muted hover:text-foreground hover:bg-hover-bg rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
        </button>
        <div className="flex items-center gap-3 pl-3 border-l border-divider">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
            {userName.charAt(0)}
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block">{userName}</span>
        </div>
      </div>
    </header>
  );
}
