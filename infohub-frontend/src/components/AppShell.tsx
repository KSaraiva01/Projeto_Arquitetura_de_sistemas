"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";
import Sidebar, { type SidebarRole } from "./Sidebar";

interface ShellState {
  /** Sidebar recolhida em ícones (só no desktop). */
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** Gaveta aberta (só no celular). */
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const ShellContext = createContext<ShellState | null>(null);

export function useShell(): ShellState {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error("useShell precisa estar dentro de <AppShell>.");
  }
  return context;
}

// A preferência de recolher vive no localStorage e é lida como uma "store
// externa": no servidor vale `false`, no cliente vale o que está guardado,
// e o React resolve a diferença na hidratação sem setState em efeito.
const COLLAPSED_KEY = "infohub-sidebar-collapsed";
const listeners = new Set<() => void>();

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? "1" : "0");
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribeCollapsed(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Casca dos painéis logados: sidebar + área de conteúdo.
 *
 * No desktop a sidebar fica fixa e pode recolher para 72px; no celular ela
 * vira uma gaveta que o botão do Header abre. O estado mora aqui para que
 * Sidebar e Header, que não são parentes, conversem sem prop drilling.
 */
export default function AppShell({
  role,
  children,
}: {
  role: SidebarRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    readCollapsed,
    () => false,
  );
  const toggleCollapsed = useCallback(() => writeCollapsed(!readCollapsed()), []);

  // A gaveta guarda em que rota foi aberta: mudar de página a fecha sem
  // precisar de um efeito observando o pathname.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = drawerPath === pathname;
  const openDrawer = useCallback(() => setDrawerPath(pathname), [pathname]);
  const closeDrawer = useCallback(() => setDrawerPath(null), []);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerPath(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const value = useMemo(
    () => ({ collapsed, toggleCollapsed, drawerOpen, openDrawer, closeDrawer }),
    [collapsed, toggleCollapsed, drawerOpen, openDrawer, closeDrawer],
  );

  return (
    <ShellContext.Provider value={value}>
      <div className="flex min-h-screen bg-background">
        {/* Fundo escuro da gaveta no celular. */}
        <div
          aria-hidden="true"
          onClick={closeDrawer}
          className={`fixed inset-0 z-30 bg-black/50 transition-opacity duration-200 md:hidden ${
            drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />

        <Sidebar role={role} />

        <div
          className={`flex-1 min-w-0 transition-[margin] duration-200 ease-enter ${
            collapsed ? "md:ml-[72px]" : "md:ml-64"
          }`}
        >
          {children}
        </div>
      </div>
    </ShellContext.Provider>
  );
}
