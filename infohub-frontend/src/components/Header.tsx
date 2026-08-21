"use client";

import { Bell, Search } from "lucide-react";

interface HeaderProps {
  title: string;
  userName: string;
  subtitle?: string;
}

export default function Header({ title, userName, subtitle }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm border-none focus:outline-none focus:ring-2 focus:ring-primary/30 w-64"
          />
        </div>
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
            {userName.charAt(0)}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{userName}</span>
        </div>
      </div>
    </header>
  );
}
