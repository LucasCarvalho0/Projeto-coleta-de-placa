'use client';

import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { LogOut, User, Factory, History, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Header() {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Histórico', href: '/history', icon: History },
  ];

  return (
    <header className="bg-slate-900/50 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-12">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Factory className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">NISSAN</h1>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Logistics Scan</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-widest transition-all
                ${pathname === item.href 
                  ? 'bg-blue-600/10 text-blue-400' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'}
              `}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-6">
        {/* User Info */}
        <div className="flex items-center gap-4 border-r border-white/5 pr-6">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white uppercase tracking-tight">{user?.nome}</div>
            <div className="text-[10px] font-mono text-slate-500 uppercase">{user?.matricula}</div>
          </div>
          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-white/5">
            <User size={20} className="text-slate-400" />
          </div>
        </div>

        {/* Logout */}
        <button 
          onClick={() => logout()}
          className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-mono uppercase tracking-widest hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
