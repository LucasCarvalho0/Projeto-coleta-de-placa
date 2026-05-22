'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { Header } from '@/components/Header';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[140px]" />
      </div>

      <Header />

      <main className="flex-1 relative z-10 w-full">
        {children}
      </main>

      {/* Status Bar Footer */}
      <footer className="bg-slate-900/80 backdrop-blur-md border-t border-white/5 px-6 py-2 flex items-center justify-between text-[10px] font-mono text-slate-500 relative z-10">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            SERVIDOR ONLINE
          </span>
          <span>ESTAÇÃO: {user.matricula}</span>
        </div>
        <div>
          V1.0.0 · NISSAN LOGISTICS · {new Date().toLocaleDateString('pt-BR')}
        </div>
      </footer>
    </div>
  );
}
