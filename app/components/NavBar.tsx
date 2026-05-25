'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  ScanBarcode,
  QrCode,
  History,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

interface NavBarProps {
  operatorName?: string;
}

const navLinks = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/collector', label: 'Cód. Barras', icon: ScanBarcode },
  { href: '/dashboard/crlv', label: 'QR Code', icon: QrCode },
  { href: '/history', label: 'Histórico', icon: History },
  { href: '/history?export=1', label: 'Exportar', icon: FileSpreadsheet },
];

export default function NavBar({ operatorName }: NavBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 bg-slate-900 border-b border-slate-700/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-black text-white text-sm group-hover:bg-red-500 transition-colors">
              N
            </div>
            <span className="font-semibold text-white hidden sm:block">Nissan Scan</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href.split('?')[0]));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {operatorName && (
              <span className="hidden sm:block text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                {operatorName}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 transition-colors px-2 py-1.5 rounded hover:bg-red-600/10"
            >
              <LogOut size={15} />
              <span className="hidden sm:block">Sair</span>
            </button>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-700/50 py-3 space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href.split('?')[0]));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-red-600/20 text-red-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
