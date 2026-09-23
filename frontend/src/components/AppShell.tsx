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
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Sidebar, { type SidebarRole } from "./Sidebar";
import { homePathFor, type ApiSessionUser } from "@/lib/api-types";
import { useSession } from "@/lib/session";

/**
 * "Cada um tem suas rotas" (nota da RF-06/RF-22): cada área do sistema só
 * abre para o perfil dela. Líder e integrante são ambos STUDENT — o papel na
 * equipe decide entre /aluno e /integrante. O backend continua sendo quem
 * garante o escopo dos dados; isto só leva cada pessoa para a área certa.
 */
const AREA_ALLOWS: Record<SidebarRole, (user: ApiSessionUser) => boolean> = {
  admin: (user) => user.role === "ADMIN",
  mentor: (user) => user.role === "MENTOR",
  aluno: (user) => user.role === "STUDENT" && homePathFor(user) === "/aluno",
  integrante: (user) => user.role === "STUDENT" && homePathFor(user) === "/integrante",
};

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
  const router = useRouter();
  const { user, loading } = useSession();
  const allowed = Boolean(user && AREA_ALLOWS[role](user));

  // Sem sessão volta ao login; perfil de outra área vai para a própria.
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/");
    else if (!AREA_ALLOWS[role](user)) router.replace(homePathFor(user));
  }, [user, loading, role, router]);

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
          {/* Enquanto a sessão carrega, cada página mostra o próprio esqueleto;
              de outra área, nada aparece até o redirecionamento. */}
          {loading || allowed ? (
            children
          ) : (
            <div role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Redirecionando...
            </div>
          )}
        </div>
      </div>
    </ShellContext.Provider>
  );
}
