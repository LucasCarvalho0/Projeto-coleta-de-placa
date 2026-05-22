'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, FileText, ArrowRight } from 'lucide-react';

export default function DashboardPortalPage() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input field
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === '1') {
        router.push('/dashboard/etiqueta');
      } else if (e.key === '2') {
        router.push('/dashboard/crlv');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-6 max-w-[1200px] mx-auto">
      {/* Portal Header */}
      <div className="text-center mb-12 space-y-3">
        <span className="text-xs font-mono text-blue-500 uppercase tracking-[0.25em] bg-blue-500/10 px-4 py-1.5 rounded-full border border-blue-500/20">
          Módulo de Emplacamento Nissan
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
          Selecione o Modo de Operação
        </h2>
        <p className="text-slate-400 max-w-lg mx-auto text-sm font-mono uppercase tracking-wider">
          Pressione a tecla numérica correspondente ou clique no card para iniciar
        </p>
      </div>

      {/* Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Etiqueta Card */}
        <button
          onClick={() => router.push('/dashboard/etiqueta')}
          className="group relative text-left bg-slate-900/40 backdrop-blur-md border border-white/5 hover:border-blue-500/40 hover:bg-slate-900/60 p-8 rounded-[2.5rem] shadow-2xl transition-all duration-300 hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {/* Neon Glow on Hover */}
          <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 rounded-[2.5rem] blur-xl transition-opacity duration-300 pointer-events-none" />

          <div className="relative flex flex-col h-full justify-between gap-8 z-10">
            <div className="flex items-start justify-between">
              <div className="p-4 bg-blue-600/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white rounded-2xl border border-blue-500/20 transition-all duration-300 shadow-lg shadow-blue-500/5">
                <Tag size={32} />
              </div>
              <span className="bg-slate-800 text-slate-400 font-mono text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 tracking-wider group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-400 transition-colors">
                [ TECLA 1 ]
              </span>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-white tracking-tight group-hover:text-blue-400 transition-colors">
                Leitura Etiqueta
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Modo simples para leitura rápida de códigos de barras ou QR Codes das etiquetas físicas dos veículos. Identifica e separa placa/chassi automaticamente.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-blue-400 uppercase tracking-widest mt-4">
              <span>Acessar Modo</span>
              <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </button>

        {/* CRLV Card */}
        <button
          onClick={() => router.push('/dashboard/crlv')}
          className="group relative text-left bg-slate-900/40 backdrop-blur-md border border-white/5 hover:border-indigo-500/40 hover:bg-slate-900/60 p-8 rounded-[2.5rem] shadow-2xl transition-all duration-300 hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {/* Neon Glow on Hover */}
          <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 rounded-[2.5rem] blur-xl transition-opacity duration-300 pointer-events-none" />

          <div className="relative flex flex-col h-full justify-between gap-8 z-10">
            <div className="flex items-start justify-between">
              <div className="p-4 bg-indigo-600/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl border border-indigo-500/20 transition-all duration-300 shadow-lg shadow-indigo-500/5">
                <FileText size={32} />
              </div>
              <span className="bg-slate-800 text-slate-400 font-mono text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 tracking-wider group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-400 transition-colors">
                [ TECLA 2 ]
              </span>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                Leitura CRLV-e
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Modo complexo de leitura a partir de documentos digitais ou QR Codes de CRLV-e. Extrai e valida a placa, chassi, Renavam e marca do veículo.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 uppercase tracking-widest mt-4">
              <span>Acessar Modo</span>
              <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
