'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Clock, CheckCircle2 } from 'lucide-react';

export function VehicleTable() {
  const { recentScans } = useAppStore();

  if (recentScans.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-4">
        <Clock size={48} className="opacity-20" />
        <p className="text-xs font-mono uppercase tracking-widest">Nenhuma leitura ainda</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
      <div className="space-y-3">
        {recentScans.map((scan, idx) => (
          <div 
            key={scan.id || idx}
            className="bg-slate-800/30 border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-blue-500/30 transition-all"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono font-bold text-white tracking-wider">{scan.placa}</span>
                <CheckCircle2 size={14} className="text-emerald-500" />
              </div>
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-tight">
                {scan.chassi}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-[10px] font-mono text-blue-400 font-bold uppercase">
                {new Date(scan.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-[9px] font-mono text-slate-600 uppercase">
                {scan.operadorNome.split(' ')[0]}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
