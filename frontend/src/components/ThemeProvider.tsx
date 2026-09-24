"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: "light",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * O tema vive no localStorage. A classe `dark` do <html> é aplicada pelo
 * script do layout antes da pintura e, depois, só pelo toggleTheme. No
 * servidor e na hidratação vale "light"; logo em seguida o React lê o valor do
 * navegador, sem erro de hidratação.
 */
const CHAVE = "infohub-theme";
const ouvintes = new Set<() => void>();
/** Escolha feita nesta página — vale mesmo se o localStorage estiver bloqueado. */
let escolhido: Theme | null = null;

function lerTema(): Theme {
  if (escolhido) return escolhido;
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === "light" || salvo === "dark") return salvo;
  } catch {
    // Armazenamento bloqueado: segue a preferência do sistema.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar);
  return () => {
    ouvintes.delete(avisar);
  };
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore<Theme>(assinar, lerTema, () => "light");

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";

    // As cores cruzam em 200ms em vez de piscar. A classe entra só durante
    // a troca para não deixar uma transição global ligada o tempo todo.
    const root = document.documentElement;
    root.classList.add("theme-transition");
    root.classList.toggle("dark", next === "dark");
    window.setTimeout(() => root.classList.remove("theme-transition"), 250);

    escolhido = next;
    try {
      localStorage.setItem(CHAVE, next);
    } catch {
      // Sem armazenamento o tema vale só até recarregar a página.
    }
    ouvintes.forEach((avisar) => avisar());
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
