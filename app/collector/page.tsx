'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ScanBarcode,
  CheckCircle2,
  AlertTriangle,
  PenLine,
  ArrowLeft,
  Trash2,
  Search,
  Save,
  RotateCcw,
  Sparkles,
  History,
  Layers,
  Car,
  ChevronRight,
  Info,
  X,
  Plus,
} from 'lucide-react';
import { parserEtiqueta } from '@/app/lib/parsers';
import toast from 'react-hot-toast';

export interface BatchItem {
  id: string;
  placa: string;
  chassi: string;
  modelo?: string;
  cor?: string;
  empresa?: string;
  hora: string;
  timestamp: number;
  origem: 'BIP' | 'MANUAL' | 'CHASSI_AVULSO';
}

type ViewMode = 'SCANNING' | 'REVIEW' | 'COMPLETED';

// Função de áudio precisa e polifônica para feedback em campo
function playAudioTone(type: 'success' | 'warning' | 'error' | 'finish') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1175, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'warning') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(370, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'finish') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        const start = ctx.currentTime + idx * 0.08;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
        osc.start(start);
        osc.stop(start + 0.15);
      });
    }
  } catch {
    // Silencia erros de áudio se o navegador bloquear autoplay
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function CollectorPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Estados da Aplicação
  const [viewMode, setViewMode] = useState<ViewMode>('SCANNING');
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [lastItem, setLastItem] = useState<BatchItem | null>(null);
  const [savingBatch, setSavingBatch] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    totalSalvo: number;
    totalDuplicadosHoje: number;
    duplicadosHoje: string[];
  } | null>(null);

  // Modal para caso onde a leitura traz apenas o chassi (sem placa)
  const [pendingChassiData, setPendingChassiData] = useState<{
    chassi: string;
    modelo?: string;
    cor?: string;
    empresa?: string;
  } | null>(null);
  const [pendingPlacaInput, setPendingPlacaInput] = useState('');
  const pendingPlacaRef = useRef<HTMLInputElement>(null);

  // Modal de Adição Manual Avulsa
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualPlaca, setManualPlaca] = useState('');
  const [manualChassi, setManualChassi] = useState('');
  const manualPlacaRef = useRef<HTMLInputElement>(null);

  // Filtro de busca na tela de revisão
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Carregar lote prévio salvo no localStorage (segurança contra refresh/queda de bateria)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nissan_active_batch');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBatch(parsed);
          setLastItem(parsed[parsed.length - 1]);
          toast.success(`Contagem anterior recuperada: ${parsed.length} veículos.`, {
            duration: 4000,
          });
        }
      }
    } catch (e) {
      console.error('Falha ao restaurar lote salvo:', e);
    }
  }, []);

  // 2. Persistir lote no localStorage a cada atualização
  useEffect(() => {
    if (batch.length > 0) {
      localStorage.setItem('nissan_active_batch', JSON.stringify(batch));
    } else {
      localStorage.removeItem('nissan_active_batch');
    }
  }, [batch]);

  // 3. Foco constante no leitor de código de barras quando em modo SCANNING
  const focusScanner = useCallback(() => {
    if (viewMode === 'SCANNING' && !pendingChassiData && !manualModalOpen) {
      inputRef.current?.focus();
    }
  }, [viewMode, pendingChassiData, manualModalOpen]);

  useEffect(() => {
    focusScanner();
    const interval = setInterval(focusScanner, 1200);
    return () => clearInterval(interval);
  }, [focusScanner]);

  // 4. Foco automático no input de placa quando faltar placa no bip
  useEffect(() => {
    if (pendingChassiData) {
      setTimeout(() => pendingPlacaRef.current?.focus(), 80);
    }
  }, [pendingChassiData]);

  // 5. Foco automático no input do modal manual
  useEffect(() => {
    if (manualModalOpen) {
      setTimeout(() => manualPlacaRef.current?.focus(), 80);
    }
  }, [manualModalOpen]);

  // Adicionar item ao lote com verificação de duplicidade interna
  const addItemToBatch = useCallback(
    (
      item: Omit<BatchItem, 'id' | 'hora' | 'timestamp' | 'origem'>,
      origem: 'BIP' | 'MANUAL' | 'CHASSI_AVULSO'
    ): boolean => {
      const placaLimpa = item.placa.toUpperCase().trim();
      const chassiLimpo = item.chassi.toUpperCase().trim();

      // Verificar se essa placa já foi bipada neste lote atual
      const indiceExistente = batch.findIndex(
        (b) => b.placa === placaLimpa || (chassiLimpo && b.chassi === chassiLimpo)
      );

      if (indiceExistente !== -1) {
        const jaBipado = batch[indiceExistente];
        playAudioTone('warning');
        toast(
          `⚠️ Placa ${placaLimpa} já está na contagem (#${indiceExistente + 1})!`,
          {
            icon: '⚠️',
            style: {
              background: '#332a00',
              color: '#fef08a',
              border: '1px solid #ca8a04',
            },
            duration: 3500,
          }
        );
        return false;
      }

      const now = new Date();
      const horaFormatada = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const newItem: BatchItem = {
        id: generateId(),
        placa: placaLimpa,
        chassi: chassiLimpo,
        modelo: item.modelo,
        cor: item.cor,
        empresa: item.empresa,
        hora: horaFormatada,
        timestamp: now.getTime(),
        origem,
      };

      setBatch((prev) => [...prev, newItem]);
      setLastItem(newItem);
      playAudioTone('success');

      return true;
    },
    [batch]
  );

  // Processamento do texto lido pelo coletor
  const processScan = useCallback(
    (raw: string) => {
      const data = parserEtiqueta(raw.trim());

      const placa = data.placa ? data.placa.toUpperCase().trim() : '';
      const chassi = data.chassi ? data.chassi.toUpperCase().trim() : '';

      // CASO 1: Bipou e puxou Chassi e Placa -> Adiciona direto no lote sem travar!
      if (placa && chassi) {
        addItemToBatch(
          {
            placa,
            chassi,
            modelo: data.modelo,
            cor: data.cor,
            empresa: data.empresa,
          },
          'BIP'
        );
        return;
      }

      // CASO 2: Bipou e puxou APENAS o Chassi (sem Placa) -> Usuário digita a placa e continua
      if (!placa && chassi) {
        playAudioTone('warning');
        setPendingChassiData({
          chassi,
          modelo: data.modelo,
          cor: data.cor,
          empresa: data.empresa,
        });
        setPendingPlacaInput('');
        return;
      }

      // CASO 3: Bipou e puxou APENAS a Placa (sem Chassi) -> Caso raro
      if (placa && !chassi) {
        playAudioTone('warning');
        toast.error('Código lido contém apenas a Placa sem o Chassi.');
        return;
      }

      // CASO 4: Não reconheceu
      playAudioTone('error');
      toast.error('Código ilegível ou formato não reconhecido.');
    },
    [addItemToBatch]
  );

  // Captura do coletor no textarea invisível
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      if (val.trim()) {
        processScan(val);
      }
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }, 250);
  };

  // Confirmação da placa digitada para o chassi avulso
  const handleConfirmPendingPlaca = () => {
    if (!pendingChassiData) return;
    const placa = pendingPlacaInput.trim().toUpperCase();

    if (!placa || placa.length < 5) {
      toast.error('Digite uma placa válida para salvar');
      playAudioTone('error');
      return;
    }

    const adicionado = addItemToBatch(
      {
        placa,
        chassi: pendingChassiData.chassi,
        modelo: pendingChassiData.modelo,
        cor: pendingChassiData.cor,
        empresa: pendingChassiData.empresa,
      },
      'CHASSI_AVULSO'
    );

    if (adicionado) {
      setPendingChassiData(null);
      setPendingPlacaInput('');
      focusScanner();
    }
  };

  // Salvar veículo manual
  const handleSaveManual = () => {
    const p = manualPlaca.trim().toUpperCase();
    const c = manualChassi.trim().toUpperCase();

    if (!p || !c) {
      toast.error('Preencha a Placa e o Chassi.');
      playAudioTone('error');
      return;
    }

    const adicionado = addItemToBatch(
      {
        placa: p,
        chassi: c,
      },
      'MANUAL'
    );

    if (adicionado) {
      setManualModalOpen(false);
      setManualPlaca('');
      setManualChassi('');
      focusScanner();
    }
  };

  // Excluir item específico da contagem
  const handleRemoveItem = (id: string, placa: string) => {
    setBatch((prev) => prev.filter((item) => item.id !== id));
    toast.success(`Placa ${placa} removida da contagem.`);
  };

  // Limpar contagem inteira
  const handleClearBatch = () => {
    if (batch.length === 0) return;
    if (window.confirm(`Tem certeza que deseja zerar a contagem de ${batch.length} veículos?`)) {
      setBatch([]);
      setLastItem(null);
      localStorage.removeItem('nissan_active_batch');
      setViewMode('SCANNING');
      toast.success('Contagem zerada.');
      focusScanner();
    }
  };

  // Salvar todo o lote no banco de dados (API Batch)
  const handleSaveBatchToDatabase = async () => {
    if (batch.length === 0) {
      toast.error('A contagem está vazia.');
      return;
    }

    setSavingBatch(true);
    try {
      const res = await fetch('/api/scans/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: batch.map((item) => ({
            placa: item.placa,
            chassi: item.chassi,
            modelo: item.modelo,
            cor: item.cor,
            empresa: item.empresa,
            tipo: item.origem === 'MANUAL' ? 'MANUAL' : 'ETIQUETA',
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        playAudioTone('error');
        toast.error(data.error || 'Erro ao gravar lote.');
        return;
      }

      playAudioTone('finish');
      setSaveResult({
        totalSalvo: data.totalSalvo,
        totalDuplicadosHoje: data.totalDuplicadosHoje,
        duplicadosHoje: data.duplicadosHoje || [],
      });

      // Limpar lote local após salvar com sucesso
      setBatch([]);
      setLastItem(null);
      localStorage.removeItem('nissan_active_batch');
      setViewMode('COMPLETED');
      toast.success(`Lote concluído! ${data.totalSalvo} veículos salvos no sistema.`);
    } catch (error) {
      playAudioTone('error');
      toast.error('Erro de conexão ao salvar o lote.');
    } finally {
      setSavingBatch(false);
    }
  };

  // Filtragem da lista para tela de revisão
  const filteredBatch = useMemo(() => {
    if (!searchQuery.trim()) return batch;
    const q = searchQuery.toUpperCase().trim();
    return batch.filter(
      (item) => item.placa.includes(q) || item.chassi.includes(q)
    );
  }, [batch, searchQuery]);

  // Teclas de Atalho globais (F2 para fechar contagem, Esc para voltar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (viewMode === 'SCANNING' && batch.length > 0) {
          setViewMode('REVIEW');
        } else if (viewMode === 'REVIEW') {
          setViewMode('SCANNING');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, batch.length]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Input invisível para receber dados do leitor USB/Bluetooth */}
      {viewMode === 'SCANNING' && !pendingChassiData && !manualModalOpen && (
        <textarea
          ref={inputRef}
          className="opacity-0 absolute h-0 w-0 -top-96 left-0 overflow-hidden pointer-events-none"
          onChange={handleInputChange}
          autoFocus
          tabIndex={0}
          aria-label="Leitor de Código de Barras"
        />
      )}

      {/* Cabeçalho Superior */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-30 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (batch.length > 0 && viewMode !== 'COMPLETED') {
                  if (confirm('Há uma contagem em andamento. Deseja realmente sair? Os itens continuam salvos no navegador.')) {
                    router.push('/dashboard');
                  }
                } else {
                  router.push('/dashboard');
                }
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Voltar ao Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <ScanBarcode size={22} className="text-red-500" />
                  Contagem Rápida em Lote
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Leitor Ativo
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Bipe continuamente sem pausas. Feche a contagem para salvar tudo de uma vez.
              </p>
            </div>
          </div>

          {/* Ações do Topo */}
          <div className="flex items-center gap-2">
            {viewMode === 'SCANNING' && (
              <>
                <button
                  onClick={() => setManualModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
                  title="Digitar veículo manualmente"
                >
                  <PenLine size={14} className="text-slate-400" />
                  <span className="hidden md:inline">Digitar</span> Manual
                </button>

                <button
                  onClick={() => setViewMode('REVIEW')}
                  disabled={batch.length === 0}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-lg ${
                    batch.length > 0
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 cursor-pointer animate-pulse'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40'
                  }`}
                  title="Fechar a contagem e ir para a tela de revisão"
                >
                  <Layers size={16} />
                  <span>Fechar Contagem ({batch.length})</span>
                  <span className="hidden lg:inline text-[10px] opacity-75 bg-emerald-800 px-1.5 py-0.5 rounded ml-1 font-mono">
                    F2
                  </span>
                </button>
              </>
            )}

            {viewMode === 'REVIEW' && (
              <button
                onClick={() => {
                  setViewMode('SCANNING');
                  focusScanner();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <ArrowLeft size={16} />
                Continuar Bipando
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL: MODOS DA TELA */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col justify-between">
        {/* ========================================================= */}
        {/* MODO 1: BIPAGEM CONTÍNUA (SCANNING)                      */}
        {/* ========================================================= */}
        {viewMode === 'SCANNING' && (
          <div className="flex-1 flex flex-col gap-6">
            {/* Bloco Superior: Contador Gigante e Status da Leitura */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Contador do Lote */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Layers size={14} className="text-emerald-400" />
                    Contagem do Lote
                  </span>
                  {batch.length > 0 && (
                    <button
                      onClick={handleClearBatch}
                      className="text-slate-500 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
                      title="Zerar contagem"
                    >
                      <RotateCcw size={13} />
                      Zerar
                    </button>
                  )}
                </div>

                <div className="flex items-baseline gap-3 my-2">
                  <span className="text-6xl sm:text-7xl font-extrabold font-mono text-emerald-400 tracking-tight">
                    {batch.length}
                  </span>
                  <span className="text-slate-400 font-medium text-sm">
                    {batch.length === 1 ? 'veículo bipado' : 'veículos bipados'}
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <span>Meta do Turno: Livre</span>
                  <span className="text-emerald-500/80 font-mono">Salvo automaticamente</span>
                </div>
              </div>

              {/* Card 2 & 3: Último Veículo Lido */}
              <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl relative">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Car size={15} className="text-blue-400" />
                    Último Veículo Bipado
                  </span>
                  {lastItem && (
                    <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg">
                      {lastItem.hora} • #{batch.length}
                    </span>
                  )}
                </div>

                {lastItem ? (
                  <div className="my-2">
                    <div className="flex flex-wrap items-baseline gap-4 mb-1">
                      <span className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-white drop-shadow-sm">
                        {lastItem.placa}
                      </span>
                      {lastItem.origem === 'CHASSI_AVULSO' && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                          Placa digitada
                        </span>
                      )}
                      {lastItem.origem === 'MANUAL' && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-mono border border-blue-500/30">
                          Manual
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 font-mono text-sm tracking-wider break-all flex items-center gap-2">
                      <span className="text-slate-500 text-xs">CHASSI:</span>
                      {lastItem.chassi}
                    </p>
                    {lastItem.modelo && (
                      <p className="text-xs text-slate-400 mt-1">
                        Modelo: <span className="text-slate-200 font-medium">{lastItem.modelo}</span>
                        {lastItem.cor && ` • Cor: ${lastItem.cor}`}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="my-auto py-6 text-center text-slate-600">
                    <p className="text-sm font-medium">Nenhum veículo lido até o momento</p>
                    <p className="text-xs mt-1">Aponte o leitor de código de barras para a etiqueta</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Pronto para o próximo bip...</span>
                  </div>
                  {batch.length > 0 && (
                    <button
                      onClick={() => setViewMode('REVIEW')}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
                    >
                      Revisar contagem completa
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Alerta de feedback sonoro e visual para o operador */}
            <div
              onClick={focusScanner}
              className="bg-slate-900/40 border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center relative group"
            >
              <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <ScanBarcode size={34} className="text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Área de Captura Contínua</h2>
              <p className="text-slate-400 text-xs sm:text-sm max-w-md">
                Bipe à vontade. Cada veículo é computado automaticamente na hora com som de confirmação.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
                <span className="bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/50">
                  Sem necessidade de confirmação
                </span>
                <span className="bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/50">
                  Aviso sonoro anti-duplicidade
                </span>
              </div>
            </div>

            {/* Tabela dos Últimos Veículos do Lote */}
            {batch.length > 0 && (
              <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <History size={16} className="text-emerald-400" />
                    Últimos Veículos Bipados ({Math.min(batch.length, 8)} de {batch.length})
                  </h3>
                  <button
                    onClick={() => setViewMode('REVIEW')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    Ver todos os {batch.length} itens
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-mono text-xs uppercase">
                        <th className="pb-2.5 font-normal">#</th>
                        <th className="pb-2.5 font-normal">Placa</th>
                        <th className="pb-2.5 font-normal">Chassi</th>
                        <th className="pb-2.5 font-normal hidden sm:table-cell">Horário</th>
                        <th className="pb-2.5 font-normal text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 font-mono text-xs sm:text-sm">
                      {batch
                        .slice(-8)
                        .reverse()
                        .map((item, idx) => {
                          const realIndex = batch.length - idx;
                          return (
                            <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-2.5 text-slate-500">{realIndex}</td>
                              <td className="py-2.5 font-bold text-emerald-400">{item.placa}</td>
                              <td className="py-2.5 text-slate-300 break-all">{item.chassi}</td>
                              <td className="py-2.5 text-slate-500 hidden sm:table-cell">{item.hora}</td>
                              <td className="py-2.5 text-right">
                                <button
                                  onClick={() => handleRemoveItem(item.id, item.placa)}
                                  className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                                  title="Remover este veículo"
                                >
                                  <Trash2 size={15} />
                                </button>
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
        )}

        {/* ========================================================= */}
        {/* MODO 2: REVISÃO DA CONTAGEM (TELA DE FECHAMENTO)          */}
        {/* ========================================================= */}
        {viewMode === 'REVIEW' && (
          <div className="flex-1 flex flex-col gap-6">
            {/* Cabeçalho da Revisão */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 size={16} />
                  Fechamento da Contagem
                </span>
                <h2 className="text-2xl font-bold text-white">Conferência dos Veículos</h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Revise os veículos lidos antes de confirmar a gravação no banco de dados.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-5 py-3 text-center">
                  <p className="text-xs text-slate-400 font-mono">TOTAL CONTADO</p>
                  <p className="text-3xl font-black text-emerald-400 font-mono">{batch.length}</p>
                </div>

                <button
                  onClick={handleSaveBatchToDatabase}
                  disabled={savingBatch || batch.length === 0}
                  className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center gap-2.5 transition-all text-base cursor-pointer"
                >
                  <Save size={20} />
                  <span>{savingBatch ? 'Salvando no Banco...' : 'Salvar Contagem'}</span>
                </button>
              </div>
            </div>

            {/* Barra de Busca e Ações Rápidas */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar por placa ou chassi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono uppercase"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => {
                    setViewMode('SCANNING');
                    focusScanner();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
                >
                  <Plus size={14} />
                  Bipar Mais Veículos
                </button>
                <button
                  onClick={handleClearBatch}
                  className="px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-red-900/50"
                >
                  <Trash2 size={14} />
                  Descartar Lote
                </button>
              </div>
            </div>

            {/* Lista Completa da Contagem */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl flex-1 flex flex-col">
              <div className="overflow-x-auto flex-1 max-h-[500px]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-850 border-b border-slate-800 text-slate-400 font-mono text-xs uppercase sticky top-0 bg-slate-900 z-10">
                    <tr>
                      <th className="py-3 px-4 font-normal">#</th>
                      <th className="py-3 px-4 font-normal">Placa</th>
                      <th className="py-3 px-4 font-normal">Chassi (VIN)</th>
                      <th className="py-3 px-4 font-normal hidden md:table-cell">Detalhes</th>
                      <th className="py-3 px-4 font-normal hidden sm:table-cell">Hora do Bip</th>
                      <th className="py-3 px-4 font-normal text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs sm:text-sm">
                    {filteredBatch.length > 0 ? (
                      filteredBatch.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-500">{index + 1}</td>
                          <td className="py-3 px-4 font-bold text-emerald-400 text-base">
                            {item.placa}
                          </td>
                          <td className="py-3 px-4 text-slate-200 tracking-wider break-all">
                            {item.chassi}
                          </td>
                          <td className="py-3 px-4 text-slate-400 hidden md:table-cell text-xs">
                            {item.modelo ? (
                              <span>
                                {item.modelo} {item.cor ? `(${item.cor})` : ''}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">
                            {item.hora}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleRemoveItem(item.id, item.placa)}
                              className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                              title="Remover este veículo da contagem"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 font-mono text-sm">
                          {searchQuery
                            ? `Nenhum veículo encontrado com o termo "${searchQuery}".`
                            : 'Nenhum veículo na contagem.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Rodapé da tabela com botão principal de salvamento */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  Mostrando {filteredBatch.length} de {batch.length} veículos coletados
                </span>
                <button
                  onClick={handleSaveBatchToDatabase}
                  disabled={savingBatch || batch.length === 0}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Save size={18} />
                  <span>{savingBatch ? 'Gravando no Sistema...' : 'Confirmar e Salvar Tudo'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODO 3: TELA DE SUCESSO PÓS-GRAVAÇÃO                      */}
        {/* ========================================================= */}
        {viewMode === 'COMPLETED' && saveResult && (
          <div className="flex-1 flex flex-col items-center justify-center py-10">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
              <div className="w-20 h-20 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 size={42} />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Contagem Salva com Sucesso!</h2>
              <p className="text-slate-400 text-sm mb-6">
                Todos os veículos do lote foram gravados e vinculados ao seu operador.
              </p>

              <div className="bg-slate-800/80 rounded-2xl p-5 mb-6 text-left border border-slate-700/50 space-y-3 font-mono">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Veículos gravados no sistema:</span>
                  <span className="text-emerald-400 font-bold text-lg">{saveResult.totalSalvo}</span>
                </div>
                {saveResult.totalDuplicadosHoje > 0 && (
                  <div className="flex justify-between items-center text-xs text-amber-400 pt-2 border-t border-slate-700/60">
                    <span>Já constavam no banco hoje:</span>
                    <span className="font-bold">{saveResult.totalDuplicadosHoje}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setSaveResult(null);
                    setViewMode('SCANNING');
                    focusScanner();
                  }}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus size={18} />
                  Iniciar Nova Contagem
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => router.push('/history')}
                    className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <History size={16} />
                    Ver Histórico
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-all"
                  >
                    Ir ao Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: CHASSI LIDO SEM PLACA                            */}
      {/* (O operador digita a placa e continua sem travar o fluxo)  */}
      {/* ========================================================= */}
      {pendingChassiData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Chassi Lido Sem Placa</h3>
                <p className="text-xs text-amber-300">
                  A etiqueta não contém a placa. Digite-a para continuar a contagem.
                </p>
              </div>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-4 mb-5 border border-slate-700">
              <span className="text-xs text-slate-500 font-mono uppercase tracking-wider block mb-1">
                Chassi Detectado
              </span>
              <p className="text-lg font-mono font-bold text-white tracking-widest break-all">
                {pendingChassiData.chassi}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
                Digite a Placa do Veículo (Pressione Enter para salvar):
              </label>
              <input
                ref={pendingPlacaRef}
                type="text"
                value={pendingPlacaInput}
                onChange={(e) => setPendingPlacaInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmPendingPlaca();
                  } else if (e.key === 'Escape') {
                    setPendingChassiData(null);
                    focusScanner();
                  }
                }}
                placeholder="Ex: TZF9G32"
                maxLength={8}
                className="w-full bg-slate-950 border-2 border-amber-500/60 rounded-xl px-4 py-3 text-2xl font-mono font-black text-amber-300 tracking-[0.2em] uppercase focus:outline-none focus:ring-4 focus:ring-amber-500/20 placeholder-slate-700"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConfirmPendingPlaca}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={18} />
                Confirmar e Continuar Bipando
              </button>
              <button
                onClick={() => {
                  setPendingChassiData(null);
                  focusScanner();
                }}
                className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-medium py-3.5 rounded-xl transition-all"
              >
                Ignorar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: DIGITAÇÃO MANUAL AVULSA                         */}
      {/* ========================================================= */}
      {manualModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <PenLine size={20} className="text-blue-400" />
                <h3 className="text-lg font-bold text-white">Inserir Veículo Manualmente</h3>
              </div>
              <button
                onClick={() => {
                  setManualModalOpen(false);
                  focusScanner();
                }}
                className="text-slate-500 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  Placa
                </label>
                <input
                  ref={manualPlacaRef}
                  type="text"
                  value={manualPlaca}
                  onChange={(e) => setManualPlaca(e.target.value.toUpperCase())}
                  placeholder="Ex: TZF9G32"
                  maxLength={8}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono font-bold text-white uppercase focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  Chassi (VIN)
                </label>
                <input
                  type="text"
                  value={manualChassi}
                  onChange={(e) => setManualChassi(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveManual();
                    }
                  }}
                  placeholder="Ex: 94DFAAP16TB024486"
                  maxLength={17}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono text-white uppercase focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveManual}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={18} />
                Adicionar à Contagem
              </button>
              <button
                onClick={() => {
                  setManualModalOpen(false);
                  focusScanner();
                }}
                className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-medium py-3.5 rounded-xl transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
