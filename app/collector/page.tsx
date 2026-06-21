'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScanBarcode, CheckCircle2, XCircle, AlertTriangle, PenLine, ArrowLeft } from 'lucide-react';
import { parserEtiqueta } from '@/app/lib/parsers';
import toast from 'react-hot-toast';

type ScanState = 'aguardando' | 'sucesso' | 'invalido' | 'duplicado';

interface ParsedData {
  placa: string;
  chassi: string;
  modelo?: string;
  cor?: string;
  empresa?: string;
}

function playBeep(sucesso: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = sucesso ? 880 : 300;
    osc.type = sucesso ? 'sine' : 'sawtooth';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (sucesso ? 0.3 : 0.5));
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + (sucesso ? 0.3 : 0.5));
  } catch {}
}

export default function CollectorPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [scanState, setScanState] = useState<ScanState>('aguardando');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [lastRaw, setLastRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualPlaca, setManualPlaca] = useState('');
  const [manualChassi, setManualChassi] = useState('');

  // Mantém foco no input invisible
  useEffect(() => {
    if (!manualMode) {
      inputRef.current?.focus();
    }
  }, [manualMode, scanState]);

  const processScan = useCallback((raw: string) => {
    setLastRaw(raw);
    const data = parserEtiqueta(raw.trim());
    
    // Converte para maiúsculo para garantir a padronização
    if (data.placa) data.placa = data.placa.toUpperCase();
    if (data.chassi) data.chassi = data.chassi.toUpperCase();

    if (!data.placa && data.chassi) {
      playBeep(true);
      toast('Apenas o chassi foi lido. Por favor, digite a Placa.', { icon: '📝', duration: 4000 });
      setManualChassi(data.chassi);
      setManualPlaca('');
      setManualMode(true);
      return;
    }

    if (data.placa && !data.chassi) {
      playBeep(true);
      toast('Apenas a placa foi lida. Por favor, digite o Chassi.', { icon: '📝', duration: 4000 });
      setManualPlaca(data.placa);
      setManualChassi('');
      setManualMode(true);
      return;
    }

    if (!data.placa && !data.chassi) {
      playBeep(false);
      setScanState('invalido');
      setTimeout(() => {
        setScanState('aguardando');
        inputRef.current?.focus();
      }, 4000);
      return;
    }
    playBeep(true);
    setParsedData(data);
    setScanState('sucesso');
  }, []);

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
    }, 300); // Aguarda 300ms após a última tecla do coletor
  };

  const handleCancel = () => {
    setParsedData(null);
    setScanState('aguardando');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  };

  const handleConfirm = useCallback(async () => {
    if (!parsedData) return;
    setLoading(true);
    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'ETIQUETA',
          placa: parsedData.placa,
          chassi: parsedData.chassi,
          modelo: parsedData.modelo,
          cor: parsedData.cor,
          empresa: parsedData.empresa,
        }),
      });
      const json = await res.json();
      if (res.status === 409) {
        setScanState('duplicado');
        toast(`⚠️ Placa ${parsedData.placa} já coletada hoje!`, { icon: '⚠️' });
      } else if (!res.ok) {
        toast.error(json.error || 'Erro ao salvar.');
      } else {
        toast.success('✅ Coleta salva com sucesso!');
        handleCancel();
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }, [parsedData, handleCancel]);



  // Suporte ao teclado: Enter ou Espaço confirma quando está no estado 'sucesso'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (scanState === 'sucesso' && !loading && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scanState, loading, handleConfirm]);

  const handleManualSave = async () => {
    if (!manualPlaca || !manualChassi) {
      toast.error('Preencha placa e chassi.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'MANUAL', placa: manualPlaca.toUpperCase(), chassi: manualChassi.toUpperCase() }),
      });
      const json = await res.json();
      if (res.status === 409) {
        toast(`⚠️ Placa ${manualPlaca} já coletada hoje!`, { icon: '⚠️' });
      } else if (!res.ok) {
        toast.error(json.error || 'Erro ao salvar.');
      } else {
        toast.success('✅ Coleta manual salva!');
        setManualPlaca('');
        setManualChassi('');
        setManualMode(false);
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ScanBarcode size={24} className="text-red-400" />
            Leitura por Código de Barras
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Conecte o coletor e realize a leitura</p>
        </div>
      </div>

      {/* Input invisível para capturar o coletor */}
      {!manualMode && (
        <textarea
          ref={inputRef}
          className="opacity-0 absolute h-0 w-0 overflow-hidden"
          onChange={handleInputChange}
          autoFocus
          tabIndex={0}
          aria-label="Campo de leitura do coletor"
        />
      )}

      {/* Estado: aguardando */}
      {scanState === 'aguardando' && !manualMode && (
        <div
          className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center cursor-pointer hover:border-slate-500 transition-colors"
          onClick={() => inputRef.current?.focus()}
        >
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-5">
            <ScanBarcode size={40} className="text-slate-500 animate-pulse" />
          </div>
          <p className="text-xl font-semibold text-slate-300">Aguardando leitura...</p>
          <p className="text-slate-500 text-sm mt-2">Aponte o coletor e leia o código de barras da etiqueta</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-slate-800 rounded-full px-4 py-2 text-xs text-slate-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Leitor ativo
          </div>
        </div>
      )}

      {/* Estado: sucesso */}
      {scanState === 'sucesso' && parsedData && !manualMode && (
        <div className="bg-slate-900 border border-green-600/30 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 size={28} className="text-green-400" />
            <span className="text-green-400 font-semibold text-lg">Leitura realizada com sucesso!</span>
          </div>
          <div className="space-y-3 mb-8">
            <div className="bg-slate-800 rounded-xl px-5 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Placa</p>
              <p className="text-2xl font-bold font-mono tracking-widest text-white">{parsedData.placa}</p>
            </div>
            <div className="bg-slate-800 rounded-xl px-5 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Chassi (VIN)</p>
              <p className="text-lg font-bold font-mono text-white">{parsedData.chassi}</p>
            </div>
            {parsedData.modelo && (
              <div className="bg-slate-800 rounded-xl px-5 py-3 flex gap-6 flex-wrap">
                {parsedData.modelo && <div><p className="text-xs text-slate-500 mb-0.5">Modelo</p><p className="text-sm font-medium text-slate-200">{parsedData.modelo}</p></div>}
                {parsedData.cor && <div><p className="text-xs text-slate-500 mb-0.5">Cor</p><p className="text-sm font-medium text-slate-200">{parsedData.cor}</p></div>}
                {parsedData.empresa && <div><p className="text-xs text-slate-500 mb-0.5">Empresa</p><p className="text-sm font-medium text-slate-200">{parsedData.empresa}</p></div>}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              id="btn-confirmar"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {loading ? 'Salvando...' : '✅ Confirmar'}
            </button>
            <button
              id="btn-cancelar"
              onClick={handleCancel}
              disabled={loading}
              className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3.5 rounded-xl transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Estado: inválido */}
      {scanState === 'invalido' && (
        <div className="bg-slate-900 border border-red-600/30 rounded-2xl p-8 text-center">
          <XCircle size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-xl font-semibold text-red-400">❌ Informação Incompleta</p>
          <p className="text-slate-400 mt-2">O código lido não contém Placa e Chassi juntos.</p>
          
          <div className="mt-6 p-4 bg-slate-800/80 rounded-xl text-left border border-slate-700/50">
            <p className="text-xs text-slate-500 uppercase mb-2 font-semibold">O que o coletor enviou:</p>
            <p className="text-sm font-mono text-slate-300 break-all whitespace-pre-wrap">{lastRaw || '(nenhum texto recebido)'}</p>
          </div>
          
          <p className="text-slate-500 text-xs mt-4">
            Dica: Certifique-se de escanear o QR Code da etiqueta (que contém tudo), e não o código de barras de linhas (que só tem o chassi).
          </p>
        </div>
      )}

      {/* Estado: duplicado */}
      {scanState === 'duplicado' && parsedData && (
        <div className="bg-slate-900 border border-yellow-600/30 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle size={28} className="text-yellow-400" />
            <span className="text-yellow-400 font-semibold text-lg">⚠️ Placa já coletada hoje!</span>
          </div>
          <div className="bg-slate-800 rounded-xl px-5 py-4 mb-6">
            <p className="text-xs text-slate-500 mb-1">Placa</p>
            <p className="text-2xl font-bold font-mono text-yellow-300">{parsedData.placa}</p>
          </div>
          <button onClick={handleCancel} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl transition-all">
            Nova Leitura
          </button>
        </div>
      )}

      {/* Modo manual */}
      {manualMode && (
        <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <PenLine size={20} className="text-slate-400" />
            Digitação Manual
          </h2>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Placa</label>
              <input
                type="text"
                id="manual-placa"
                value={manualPlaca}
                onChange={(e) => setManualPlaca(e.target.value.toUpperCase())}
                placeholder="Ex: TZF9G32"
                maxLength={8}
                className="w-full bg-slate-800 border border-slate-600 text-white font-mono text-xl tracking-widest rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Chassi (VIN)</label>
              <input
                type="text"
                id="manual-chassi"
                value={manualChassi}
                onChange={(e) => setManualChassi(e.target.value.toUpperCase())}
                placeholder="Ex: 94DFAAP16TB024486"
                maxLength={17}
                className="w-full bg-slate-800 border border-slate-600 text-white font-mono tracking-wider rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              id="btn-salvar-manual"
              onClick={handleManualSave}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => { setManualMode(false); setManualPlaca(''); setManualChassi(''); }}
              className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3.5 rounded-xl transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Botão: Digitar Manualmente */}
      {!manualMode && scanState === 'aguardando' && (
        <div className="mt-6 text-center">
          <button
            id="btn-manual"
            onClick={() => setManualMode(true)}
            className="flex items-center gap-2 mx-auto text-slate-400 hover:text-white transition-colors text-sm"
          >
            <PenLine size={15} />
            Digitar Manualmente
          </button>
        </div>
      )}
    </div>
  );
}
