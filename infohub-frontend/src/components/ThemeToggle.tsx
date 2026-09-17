"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover-bg hover:text-foreground ${className}`}
      title={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
      aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
    >
      {/* Os dois ícones ficam montados e giram um para dentro do outro. */}
      <Moon
        className={`absolute h-5 w-5 transition-[transform,opacity] duration-200 ease-enter ${
          theme === "light" ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"
        }`}
      />
      <Sun
        className={`absolute h-5 w-5 transition-[transform,opacity] duration-200 ease-enter ${
          theme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
        }`}
      />
    </button>
  );
}
