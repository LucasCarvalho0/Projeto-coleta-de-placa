'use client';

import Link from 'next/link';
import { ScanBarcode, QrCode, Clock, Car, Hash, User2, TrendingUp } from 'lucide-react';

interface DashboardClientProps {
  totalHoje: number;
  ultimaPlaca: string | null;
  ultimoChassi: string | null;
  operadorNome: string;
  ultimaLeitura: string | null;
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

export default function DashboardClient({
  totalHoje,
  ultimaPlaca,
  ultimoChassi,
  operadorNome,
  ultimaLeitura,
}: DashboardClientProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-slate-500 text-sm capitalize">{formatDate()}</p>
        <h1 className="text-3xl font-bold text-white mt-1">Dashboard</h1>
        <p className="text-slate-400 mt-1">Bem-vindo, <span className="text-white font-medium">{operadorNome}</span></p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-green-500/15 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-green-400" />
            </div>
            <span className="text-slate-400 text-sm">Coletas Hoje</span>
          </div>
          <p className="text-4xl font-bold text-white">{totalHoje}</p>
        </div>

        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-blue-500/15 rounded-xl flex items-center justify-center">
              <Car size={18} className="text-blue-400" />
            </div>
            <span className="text-slate-400 text-sm">Última Placa</span>
          </div>
          <p className="text-xl font-bold text-white font-mono tracking-widest">
            {ultimaPlaca ?? '—'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 col-span-2 md:col-span-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-purple-500/15 rounded-xl flex items-center justify-center">
              <Hash size={18} className="text-purple-400" />
            </div>
            <span className="text-slate-400 text-sm">Último Chassi</span>
          </div>
          <p className="text-sm font-bold text-white font-mono break-all">
            {ultimoChassi ?? '—'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-yellow-500/15 rounded-xl flex items-center justify-center">
              <User2 size={18} className="text-yellow-400" />
            </div>
            <span className="text-slate-400 text-sm">Operador</span>
          </div>
          <p className="text-lg font-bold text-white">{operadorNome}</p>
        </div>

        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 col-span-2 md:col-span-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-red-500/15 rounded-xl flex items-center justify-center">
              <Clock size={18} className="text-red-400" />
            </div>
            <span className="text-slate-400 text-sm">Hora da Última Leitura</span>
          </div>
          <p className="text-3xl font-bold text-white">{formatTime(ultimaLeitura)}</p>
        </div>
      </div>

      {/* Ação rápida */}
      <h2 className="text-lg font-semibold text-slate-300 mb-4">Iniciar Coleta</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/collector"
          id="btn-coletor"
          className="group flex items-center gap-4 bg-slate-900 hover:bg-slate-800 border border-slate-700/50 hover:border-red-600/50 rounded-2xl p-6 transition-all"
        >
          <div className="w-14 h-14 bg-red-600/15 group-hover:bg-red-600/25 rounded-xl flex items-center justify-center transition-colors">
            <ScanBarcode size={28} className="text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-lg">Código de Barras</p>
            <p className="text-slate-400 text-sm">Coletor USB / Bluetooth</p>
          </div>
        </Link>

        <Link
          href="/dashboard/crlv"
          id="btn-qrcode"
          className="group flex items-center gap-4 bg-slate-900 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-600/50 rounded-2xl p-6 transition-all"
        >
          <div className="w-14 h-14 bg-blue-600/15 group-hover:bg-blue-600/25 rounded-xl flex items-center justify-center transition-colors">
            <QrCode size={28} className="text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-lg">QR Code CRLV-e</p>
            <p className="text-slate-400 text-sm">Câmera do dispositivo</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
