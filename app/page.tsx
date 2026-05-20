'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { Header } from '@/components/Header';
import { ScannerInput } from '@/components/ScannerInput';
import { StatsCards } from '@/components/StatsCards';
import { VehicleTable } from '@/components/VehicleTable';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuthStore();
  const { loadInitialData } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user, loadInitialData]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="text-blue-500 animate-spin" size={40} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header Profissional */}
      <Header />

      <div className="flex-1 px-4 py-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Layout em Grid para Dashboard Industrial */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Coluna Esquerda: Scanner e Stats */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6 shadow-xl">
              <h2 className="text-sm font-mono text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Terminal de Coleta Ativo
              </h2>
              <ScannerInput />
            </div>

            <StatsCards />
          </div>

          {/* Coluna Direita: Tabela em Tempo Real */}
          <div className="lg:col-span-4">
            <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6 shadow-xl h-full flex flex-col">
              <h2 className="text-sm font-mono text-slate-500 uppercase tracking-[0.2em] mb-6">
                Leituras Recentes
              </h2>
              <div className="flex-1 overflow-hidden">
                <VehicleTable />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer / Status Bar */}
      <footer className="bg-slate-900/80 backdrop-blur-md border-t border-white/5 px-6 py-2 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            SERVIDOR ONLINE
          </span>
          <span>ESTAÇÃO: {user.matricula}</span>
        </div>
        <div>
          V1.0.0 · NISSAN LOGISTICS · {new Date().toLocaleDateString('pt-BR')}
        </div>
      </footer>
    </main>
  );
}
