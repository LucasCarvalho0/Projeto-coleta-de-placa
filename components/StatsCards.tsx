'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { BarChart3, Users, Calendar, AlertTriangle } from 'lucide-react';

export function StatsCards() {
  const { stats } = useAppStore();

  const cards = [
    {
      label: 'Total Coletado',
      value: stats.total,
      icon: BarChart3,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Suas Coletas',
      value: stats.operador,
      icon: Users,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Total do Dia',
      value: stats.dia,
      icon: Calendar,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Duplicados',
      value: stats.duplicados,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div 
          key={idx}
          className="bg-slate-900/40 backdrop-blur-sm border border-white/5 p-6 rounded-3xl shadow-lg transition-transform hover:scale-[1.02]"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-xl ${card.bg}`}>
              <card.icon className={card.color} size={18} />
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{card.label}</span>
          </div>
          <div className="text-3xl font-mono font-bold text-white">
            {(card.value ?? 0).toString().padStart(2, '0')}
          </div>
        </div>
      ))}
    </div>
  );
}
