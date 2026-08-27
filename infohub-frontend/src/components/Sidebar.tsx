"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  LogOut,
  ClipboardList,
  Lightbulb,
} from "lucide-react";
import InfoHubLogo from "./InfoHubLogo";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/equipes", label: "Equipes", icon: Users },
  { href: "/admin/tarefas", label: "Tarefas", icon: ClipboardList },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
];

const mentorLinks = [
  { href: "/mentor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mentor/equipes", label: "Minhas Equipes", icon: Users },
  { href: "/mentor/tarefas", label: "Tarefas", icon: ClipboardList },
];

const studentLinks = [
  { href: "/aluno", label: "Minha Jornada", icon: Lightbulb },
  { href: "/aluno/tarefas", label: "Minhas Tarefas", icon: ClipboardList },
];

const roleLabels = {
  admin: "Administrador",
  mentor: "Mentor",
  aluno: "Aluno",
};

export default function Sidebar({ role }: { role: "admin" | "aluno" | "mentor" }) {
  const pathname = usePathname();
  const links = role === "admin" ? adminLinks : role === "mentor" ? mentorLinks : studentLinks;

  return (
    <aside className="w-64 bg-sidebar-bg text-sidebar-text flex flex-col min-h-screen fixed left-0 top-0 z-30">
      <div className="p-5 border-b border-sidebar-border">
        <InfoHubLogo size="sm" variant="light" />
      </div>

      <div className="px-5 py-3">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-light">
          {roleLabels[role]}
        </span>
      </div>

      <nav className="flex-1 px-3">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/admin" && link.href !== "/aluno" && link.href !== "/mentor" && pathname.startsWith(link.href));
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
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-light hover:text-white rounded-lg hover:bg-sidebar-hover transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </Link>
      </div>
    </aside>
  );
}
