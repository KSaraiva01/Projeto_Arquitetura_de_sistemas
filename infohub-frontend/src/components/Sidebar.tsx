"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  PanelLeftClose,
  Users,
  X,
} from "lucide-react";
import InfoHubLogo, { LogoIcon } from "./InfoHubLogo";
import { useShell } from "./AppShell";
import { useSession } from "@/lib/session";

export type SidebarRole = "admin" | "aluno" | "mentor" | "integrante";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/equipes", label: "Equipes", icon: Users },
  { href: "/admin/tarefas", label: "Tarefas", icon: ClipboardList },
  { href: "/admin/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
];

const mentorLinks = [
  { href: "/mentor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mentor/equipes", label: "Minhas Equipes", icon: Users },
  { href: "/mentor/tarefas", label: "Tarefas", icon: ClipboardList },
  { href: "/mentor/calendario", label: "Calendário", icon: CalendarDays },
];

const studentLinks = [
  { href: "/aluno", label: "Minha Jornada", icon: Lightbulb },
  { href: "/aluno/tarefas", label: "Minhas Tarefas", icon: ClipboardList },
  { href: "/aluno/calendario", label: "Calendário", icon: CalendarDays },
];

const memberLinks = [
  { href: "/integrante", label: "Minha Jornada", icon: Lightbulb },
  { href: "/integrante/tarefas", label: "Minhas Tarefas", icon: ClipboardList },
  { href: "/integrante/calendario", label: "Calendário", icon: CalendarDays },
];

const roleLabels = {
  admin: "Administrador",
  mentor: "Mentor",
  aluno: "Aluno (líder)",
  integrante: "Integrante de equipe",
};

const ROOTS = ["/admin", "/aluno", "/mentor", "/integrante"];

/**
 * Menu lateral. No desktop é fixo e recolhe para uma régua de ícones; no
 * celular é a gaveta que o AppShell abre e fecha.
 */
export default function Sidebar({ role }: { role: SidebarRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useSession();
  const { collapsed, toggleCollapsed, drawerOpen, closeDrawer } = useShell();

  const links =
    role === "admin"
      ? adminLinks
      : role === "mentor"
        ? mentorLinks
        : role === "integrante"
          ? memberLinks
          : studentLinks;

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  // Os rótulos somem com opacidade (150ms) enquanto a largura anima (200ms);
  // no celular a sidebar nunca recolhe, só desliza.
  const labelClass = `whitespace-nowrap transition-opacity duration-150 ${
    collapsed ? "md:opacity-0 md:w-0 md:overflow-hidden" : "opacity-100"
  }`;

  return (
    <aside
      aria-label="Menu principal"
      className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar-bg text-sidebar-text shadow-2xl transition-[transform,width] duration-200 ease-enter md:translate-x-0 md:shadow-none ${
        drawerOpen ? "translate-x-0" : "-translate-x-full"
      } ${collapsed ? "md:w-[72px]" : "md:w-64"}`}
    >
      <div
        className={`flex items-center border-b border-sidebar-border ${
          collapsed ? "md:justify-center md:px-0" : ""
        } justify-between p-5`}
      >
        {collapsed ? (
          <>
            <span className="md:hidden">
              <InfoHubLogo size="sm" variant="light" />
            </span>
            <LogoIcon className="hidden h-10 w-8 md:block" />
          </>
        ) : (
          <InfoHubLogo size="sm" variant="light" />
        )}

        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Fechar menu"
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-muted-light transition-colors hover:bg-sidebar-hover hover:text-white md:hidden"
        >
          <X className="h-5 w-5" />
        </button>

        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Recolher menu"
            title="Recolher menu"
            className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-light transition-colors hover:bg-sidebar-hover hover:text-white md:flex"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label="Expandir menu"
          title="Expandir menu"
          className="mx-auto mt-3 hidden h-8 w-8 items-center justify-center rounded-md text-muted-light transition-colors hover:bg-sidebar-hover hover:text-white md:flex"
        >
          <PanelLeftClose className="h-4 w-4 rotate-180" />
        </button>
      )}

      <div
        className={`px-5 py-3 transition-opacity duration-150 ${
          collapsed ? "md:pointer-events-none md:h-0 md:overflow-hidden md:py-0 md:opacity-0" : ""
        }`}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-light">
          {roleLabels[role]}
        </span>
        {user && (
          <p className="mt-0.5 truncate text-sm text-sidebar-text">{user.name}</p>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (!ROOTS.includes(link.href) && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                collapsed ? "md:justify-center md:px-0" : ""
              } ${
                isActive
                  ? "bg-sidebar-active-bg font-medium text-sidebar-active-text"
                  : "text-sidebar-text hover:bg-sidebar-hover"
              }`}
            >
              <link.icon className="h-5 w-5 shrink-0" />
              <span className={labelClass}>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={() => void handleSignOut()}
          title={collapsed ? "Sair" : undefined}
          className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-light transition-colors hover:bg-sidebar-hover hover:text-white ${
            collapsed ? "md:justify-center md:px-0" : ""
          }`}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className={labelClass}>Sair</span>
        </button>
      </div>
    </aside>
  );
}
