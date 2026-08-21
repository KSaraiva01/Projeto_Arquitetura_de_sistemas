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

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/equipes", label: "Equipes", icon: Users },
  { href: "/admin/tarefas", label: "Tarefas", icon: ClipboardList },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
];

const studentLinks = [
  { href: "/aluno", label: "Minha Jornada", icon: Lightbulb },
  { href: "/aluno/tarefas", label: "Minhas Tarefas", icon: ClipboardList },
];

export default function Sidebar({ role }: { role: "admin" | "aluno" }) {
  const pathname = usePathname();
  const links = role === "admin" ? adminLinks : studentLinks;

  return (
    <aside className="w-64 bg-sidebar-bg text-sidebar-text flex flex-col min-h-screen fixed left-0 top-0 z-30">
      <div className="p-5 border-b border-sidebar-hover">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">InfoHub</h1>
            <p className="text-xs text-gray-400">InovAMF</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/admin" && link.href !== "/aluno" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-active text-white font-medium"
                  : "text-sidebar-text hover:bg-sidebar-hover"
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-hover">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </Link>
      </div>
    </aside>
  );
}
