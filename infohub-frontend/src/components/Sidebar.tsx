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
  Users,
} from "lucide-react";
import InfoHubLogo from "./InfoHubLogo";
import { useSession } from "@/lib/session";

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

export default function Sidebar({
  role,
}: {
  role: "admin" | "aluno" | "mentor" | "integrante";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useSession();

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

  return (
    <aside className="w-64 bg-sidebar-bg text-sidebar-text flex flex-col min-h-screen fixed left-0 top-0 z-30">
      <div className="p-5 border-b border-sidebar-border">
        <InfoHubLogo size="sm" variant="light" />
      </div>

      <div className="px-5 py-3">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-light">
          {roleLabels[role]}
        </span>
        {user && (
          <p className="text-sm text-sidebar-text mt-0.5 truncate">{user.name}</p>
        )}
      </div>

      <nav className="flex-1 px-3">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/admin" &&
              link.href !== "/aluno" &&
              link.href !== "/mentor" &&
              link.href !== "/integrante" &&
              pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg mb-0.5 transition-colors ${
                isActive
                  ? "bg-sidebar-active-bg text-sidebar-active-text font-medium"
                  : "text-sidebar-text hover:bg-sidebar-hover"
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-muted-light hover:text-white rounded-lg hover:bg-sidebar-hover transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </aside>
  );
}
