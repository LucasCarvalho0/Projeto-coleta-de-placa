'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { 
  Search, FileSpreadsheet, Filter, 
  ChevronLeft, ChevronRight, Loader2,
  Calendar, User, Scan, Hash
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function HistoryPage() {
  const { user, isLoading: authLoading } = useAuthStore();
  const router = useRouter();
  
  const [scans, setScans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filtros
  const [filterPlaca, setFilterPlaca] = useState('');
  const [filterChassi, setFilterChassi] = useState('');
  const [filterOperador, setFilterOperador] = useState('');
  const [filterData, setFilterData] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchScans = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterPlaca) params.append('placa', filterPlaca);
      if (filterChassi) params.append('chassi', filterChassi);
      if (filterOperador) params.append('operador', filterOperador);
      if (filterData) params.append('data', filterData);

      const res = await fetch(`/api/scans?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setScans(data.scans);
      }
    } catch (error) {
      toast.error('Erro ao carregar histórico');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchScans();
    }
  }, [user]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (filterPlaca) params.append('placa', filterPlaca);
      if (filterChassi) params.append('chassi', filterChassi);
      if (filterOperador) params.append('operador', filterOperador);
      if (filterData) params.append('data', filterData);

      const res = await fetch(`/api/export?${params.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `coletas_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success('Excel gerado com sucesso!');
      } else {
        toast.error('Erro ao exportar Excel');
      }
    } catch (error) {
      toast.error('Erro na exportação');
    } finally {
      setIsExporting(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Header />

      <div className="flex-1 px-8 py-8 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Top Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Histórico de Coletas</h1>
            <p className="text-slate-500 text-sm font-mono mt-1 uppercase tracking-widest">Consulta e auditoria de registros</p>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting || isLoading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={20} className="animate-spin" /> : <FileSpreadsheet size={20} />}
            EXPORTAR EXCEL
          </button>
        </div>

        {/* Filters Bar */}
        <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 p-6 rounded-3xl shadow-xl grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Scan size={12} /> Placa
            </label>
            <input
              type="text"
              value={filterPlaca}
              onChange={(e) => setFilterPlaca(e.target.value.toUpperCase())}
              placeholder="ABC1D23"
              className="w-full bg-slate-800/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Hash size={12} /> Chassi
            </label>
            <input
              type="text"
              value={filterChassi}
              onChange={(e) => setFilterChassi(e.target.value.toUpperCase())}
              placeholder="VIN / 17 Chars"
              className="w-full bg-slate-800/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <User size={12} /> Operador
            </label>
            <input
              type="text"
              value={filterOperador}
              onChange={(e) => setFilterOperador(e.target.value)}
              placeholder="Nome do operador"
              className="w-full bg-slate-800/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={12} /> Data
            </label>
            <input
              type="date"
              value={filterData}
              onChange={(e) => setFilterData(e.target.value)}
              className="w-full bg-slate-800/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all [color-scheme:dark]"
            />
          </div>
          <button
            onClick={fetchScans}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all"
          >
            <Filter size={18} />
            FILTRAR
          </button>
        </div>

        {/* Results Table */}
        <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Data / Hora</th>
                  <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Placa</th>
                  <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Chassi</th>
                  <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Operador</th>
                  <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <Loader2 size={32} className="text-blue-500 animate-spin mx-auto mb-4" />
                      <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Buscando registros...</p>
                    </td>
                  </tr>
                ) : scans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <Search size={32} className="text-slate-700 mx-auto mb-4" />
                      <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Nenhum registro encontrado</p>
                    </td>
                  </tr>
                ) : (
                  scans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-blue-400">
                        {new Date(scan.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-bold tracking-wider text-white">{scan.placa}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-slate-400">{scan.chassi}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-slate-300">{scan.operadorNome}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-md">OK</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
