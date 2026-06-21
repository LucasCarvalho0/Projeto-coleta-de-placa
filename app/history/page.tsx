'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { History, Search, FileSpreadsheet, X, Filter, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface Scan {
  id: number;
  tipo: string;
  placa: string;
  chassi: string;
  modelo?: string;
  cor?: string;
  createdAt: string;
  operador: { nome: string; matricula: string };
}

export default function HistoryPage() {
  const router = useRouter();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [totalGeral, setTotalGeral] = useState<number | null>(null);

  // Filtros
  const [placa, setPlaca] = useState('');
  const [chassi, setChassi] = useState('');
  const [operador, setOperador] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const fetchScans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (placa) params.set('placa', placa);
      if (chassi) params.set('chassi', chassi);
      if (operador) params.set('operador', operador);
      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);

      const res = await fetch(`/api/scans?${params.toString()}`);
      if (!res.ok) throw new Error('Erro ao buscar coletas');
      const data = await res.json();
      setScans(data.scans || []);
      if (typeof data.totalGeral === 'number') setTotalGeral(data.totalGeral);
    } catch {
      toast.error('Erro ao carregar histórico.');
    } finally {
      setLoading(false);
    }
  }, [placa, chassi, operador, dataInicio, dataFim]);

  useEffect(() => {
    fetchScans();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchScans();
  };

  const handleClearFilters = () => {
    setPlaca('');
    setChassi('');
    setOperador('');
    setDataInicio('');
    setDataFim('');
    setTimeout(fetchScans, 0);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);
      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      a.href = url;
      a.download = `coletas_${hoje}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Planilha exportada com sucesso!');
    } catch {
      toast.error('Erro ao exportar.');
    } finally {
      setExporting(false);
    }
  };

  function formatDateTime(iso: string) {
    const d = new Date(iso);
    return {
      data: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d),
      hora: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }).format(d),
    };
  }

  function tipoBadge(tipo: string) {
    if (tipo === 'CRLV') return 'bg-blue-600/20 text-blue-300 border border-blue-600/30';
    if (tipo === 'MANUAL') return 'bg-yellow-600/20 text-yellow-300 border border-yellow-600/30';
    return 'bg-slate-700 text-slate-300 border border-slate-600';
  }

  const hasFilters = placa || chassi || operador || dataInicio || dataFim;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <History size={24} className="text-purple-400" />
              Histórico de Coletas
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {loading ? 'Carregando...' : `${scans.length} registro${scans.length !== 1 ? 's' : ''} encontrado${scans.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button
          id="btn-exportar"
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm"
        >
          <FileSpreadsheet size={16} />
          {exporting ? 'Exportando...' : 'Exportar Excel'}
        </button>
      </div>

      {/* Cards de totais */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <Filter size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">{hasFilters ? 'Registros no filtro' : 'Registros carregados'}</p>
            <p className="text-2xl font-bold text-white">{loading ? '—' : scans.length}</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <History size={18} className="text-purple-400" />
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-0.5">Total geral no sistema</p>
            <p className="text-2xl font-bold text-white">{totalGeral !== null ? totalGeral : '—'}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <form onSubmit={handleSearch} className="bg-slate-900 border border-slate-700/50 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={15} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Filtros</span>
          {hasFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
            >
              <X size={12} />
              Limpar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Placa"
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            className="bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 font-mono"
          />
          <input
            type="text"
            placeholder="Chassi"
            value={chassi}
            onChange={(e) => setChassi(e.target.value.toUpperCase())}
            className="bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 font-mono"
          />
          <input
            type="text"
            placeholder="Operador"
            value={operador}
            onChange={(e) => setOperador(e.target.value)}
            className="bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
          />
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
            title="Data início"
          />
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="bg-slate-800 border border-slate-600 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40"
            title="Data fim"
          />
        </div>
        <button
          type="submit"
          id="btn-buscar"
          className="mt-3 flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-all"
        >
          <Search size={15} />
          Buscar
        </button>
      </form>

      {/* Tabela */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400">Carregando coletas...</p>
        </div>
      ) : scans.length === 0 ? (
        <div className="text-center py-20 bg-slate-900 border border-slate-700/50 rounded-2xl">
          <History size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Nenhuma coleta encontrada</p>
          {hasFilters && <p className="text-slate-600 text-sm mt-1">Tente remover os filtros</p>}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Data</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Hora</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Operador</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Placa</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Chassi (VIN)</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan, i) => {
                  const { data, hora } = formatDateTime(scan.createdAt);
                  return (
                    <tr
                      key={scan.id}
                      className={`border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors ${
                        i % 2 === 0 ? '' : 'bg-slate-800/20'
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-300">{data}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono">{hora}</td>
                      <td className="px-4 py-3 text-slate-200">{scan.operador.nome}</td>
                      <td className="px-4 py-3 font-mono font-bold text-white tracking-widest">{scan.placa}</td>
                      <td className="px-4 py-3 font-mono text-slate-300 text-xs">{scan.chassi}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tipoBadge(scan.tipo)}`}>
                          {scan.tipo}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
