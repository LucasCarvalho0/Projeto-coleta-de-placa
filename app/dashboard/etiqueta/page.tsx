'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { playBeep } from '@/utils/scanner';
import { Tag, Scan, Loader2, CheckCircle2, AlertCircle, Trash2, ArrowLeft, Save } from 'lucide-react';
import { StatsCards } from '@/components/StatsCards';
import { VehicleTable } from '@/components/VehicleTable';
import Link from 'next/link';
import toast from 'react-hot-toast';

const REGEX_PLACA = /\b[A-Z]{3}[0-9][A-Z0-9][0-9]{2}\b/;
const REGEX_CHASSI = /\b[A-HJ-NPR-Z0-9]{17}\b/;

export default function EtiquetaPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const {
    setScanMode,
    currentPlaca,
    currentChassi,
    setCurrentPlaca,
    setCurrentChassi,
    resetCurrent,
    addRecentScan,
    setStats,
    base,
  } = useAppStore();

  // Garante que o modo de coleta esteja setado como ETIQUETA
  useEffect(() => {
    setScanMode('ETIQUETA');
    resetCurrent();
  }, [setScanMode, resetCurrent]);

  // Foco automático e contínuo no campo do leitor
  const refocusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    refocusInput();
    const interval = setInterval(refocusInput, 1000);
    return () => clearInterval(interval);
  }, [refocusInput]);

  // Salvar manualmente ou automaticamente
  const handleSave = async () => {
    if (!currentPlaca || !currentChassi) {
      toast.error('Preencha a Placa e o Chassi para salvar');
      playBeep('warning');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placa: currentPlaca,
          chassi: currentChassi,
          tipo: 'ETIQUETA',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        playBeep('success');
        toast.success(`Coleta salva: ${currentPlaca}`);
        addRecentScan(data.scan);
        setStats(data.stats);
        resetCurrent();
      } else {
        playBeep('error');
        if (data.type === 'DUPLICATE_PLACA') {
          toast.error('⚠️ Placa já coletada');
          setCurrentPlaca('');
        } else if (data.type === 'DUPLICATE_CHASSI') {
          toast.error('⚠️ Chassi já coletado');
          setCurrentChassi('');
        } else {
          toast.error(data.error || 'Erro ao salvar');
        }
      }
    } catch (error) {
      playBeep('error');
      toast.error('Erro de conexão com o servidor');
    } finally {
      setIsSaving(false);
      refocusInput();
    }
  };

  // Auto-salvar quando ambos estiverem preenchidos
  useEffect(() => {
    if (isSaving) return;
    if (currentPlaca && currentChassi) {
      handleSave();
    }
  }, [currentPlaca, currentChassi, isSaving]);

  // Parser específico para Modo Etiqueta

  // Auto‑fetch missing placa when only VIN is known
  useEffect(() => {
    if (currentChassi && !currentPlaca) {
      fetch(`/api/scans?chassi=${encodeURIComponent(currentChassi)}&limit=1`)
        .then((res) => res.json())
        .then((data) => {
          if (data.scans && data.scans.length > 0) {
            const fetchedPlaca = data.scans[0].placa;
            if (fetchedPlaca) {
              setCurrentPlaca(fetchedPlaca);
              toast.success(`Placa obtida do histórico: ${fetchedPlaca}`);
            }
          }
        })
        .catch(() => {
          // Silently ignore errors – user can still type placa manually
        });
    }
  }, [currentChassi, currentPlaca, setCurrentPlaca]);
  const parserEtiqueta = (inputStr: string) => {
    const clean = inputStr.trim().toUpperCase();

    // Helper para verificar se o chassi é real (não começa com padrão de placa)
    const isRealChassi = (chassiCandidate: string): boolean => {
      return !chassiCandidate.match(/^[A-Z]{3}[0-9]/);
    };

    // 1. Se tem exatamente 17 caracteres e começa com padrão de placa,
    // tratamos como PLACA e extraímos os 7 caracteres iniciais.
    if (clean.length === 17 && !isRealChassi(clean)) {
      return { placa: clean.slice(0, 7) };
    }

    // 2. Se a string contém um padrão de placa flexível (como TZF9G321490099252 ou TZF-9G32...)
    // nós tratamos isso apenas como PLACA, ignorando o chassi parcial para evitar conflitos
    const matchPlacaFlex = clean.match(/[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}/);
    if (matchPlacaFlex) {
      return { placa: matchPlacaFlex[0].replace('-', '') };
    }

    const matchPlaca = clean.match(REGEX_PLACA);
    const matchChassi = clean.match(REGEX_CHASSI);

    const res: { placa?: string; chassi?: string } = {};
    if (matchPlaca) {
      res.placa = matchPlaca[0];
    }
    if (matchChassi && isRealChassi(matchChassi[0])) {
      res.chassi = matchChassi[0];
    }
    return res;
  };

  const handleProcess = (raw: string) => {
    const value = raw.trim().toUpperCase();
    if (!value) return;

    const resultado = parserEtiqueta(value);
    let foundSomething = false;

    if (resultado.placa) {
      if (currentPlaca !== resultado.placa) {
        setCurrentPlaca(resultado.placa);
        foundSomething = true;
      }

      // Auto-preenche o chassi a partir da base importada
      if (base && Object.keys(base).length > 0) {
        const placaUpper = resultado.placa.toUpperCase();
        const vehicle = Object.values(base).find(
          (v: any) => v.placa && v.placa.toUpperCase() === placaUpper
        );
        if (vehicle && vehicle.vin && currentChassi !== vehicle.vin) {
          setCurrentChassi(vehicle.vin);
          foundSomething = true;
          toast.success(`Chassi encontrado na base: ${vehicle.vin}`);
        }
      }
    }

    if (resultado.chassi) {
      if (currentChassi !== resultado.chassi) {
        setCurrentChassi(resultado.chassi);
        foundSomething = true;
      }

      // Auto-preenche a placa a partir da base importada
      if (base && Object.keys(base).length > 0) {
        const vehicle = base[resultado.chassi];
        if (vehicle && vehicle.placa && vehicle.placa !== '-') {
          if (currentPlaca !== vehicle.placa) {
            setCurrentPlaca(vehicle.placa);
            foundSomething = true;
            toast.success(`Placa auto-preenchida: ${vehicle.placa}`);
          }
        }
      }
    }

    if (foundSomething) {
      playBeep('success');
    } else {
      toast.error('Código não reconhecido no modo etiqueta');
      playBeep('error');
    }

    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProcess(inputValue);
    }
  };

  return (
    <div className="px-4 py-6 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Breadcrumbs / Voltar */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 text-xs font-mono transition-all"
        >
          <ArrowLeft size={14} />
          VOLTAR AO MENU
        </Link>
        <span className="text-slate-600 font-mono text-xs">/</span>
        <span className="text-slate-400 font-mono text-xs uppercase flex items-center gap-1.5">
          <Tag size={12} className="text-blue-500" />
          Modo Etiqueta
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Terminal de Coleta e Stats */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-mono text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Terminal Etiqueta Ativo
              </h2>
              <span className="text-[10px] font-mono text-slate-600 border border-slate-800 rounded bg-slate-950 px-2 py-0.5 uppercase">
                Modo Simples
              </span>
            </div>

            {/* Scanner Input Group */}
            <div className="relative group mb-8">
              <div
                className={`
                  relative rounded-2xl border-2 transition-all duration-300 shadow-2xl 
                  ${
                    isSaving
                      ? 'border-blue-500 bg-blue-500/5 animate-pulse'
                      : 'border-slate-700 bg-slate-900/50 hover:border-slate-500 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10'
                  }
                `}
              >
                <div className="absolute left-6 top-1/2 -translate-y-1/2">
                  {isSaving ? (
                    <Loader2 className="text-blue-500 animate-spin" size={28} />
                  ) : (
                    <Scan className="text-slate-500 group-hover:text-blue-400 transition-colors" size={28} />
                  )}
                </div>

                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isSaving
                      ? 'SALVANDO NO BANCO...'
                      : 'BIPE A ETIQUETA (PLACA OU CHASSI)...'
                  }
                  className="w-full h-20 bg-transparent pl-20 pr-6 text-2xl font-mono text-white placeholder-slate-700 focus:outline-none tracking-[0.2em] uppercase"
                  autoComplete="off"
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Field Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Card Placa */}
              <div
                className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                  currentPlaca
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-slate-800 bg-slate-900/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                    Veículo / Placa
                  </span>
                  {currentPlaca ? (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  ) : (
                    <AlertCircle size={16} className="text-slate-700" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-2xl font-mono font-bold tracking-widest ${
                      currentPlaca ? 'text-emerald-400' : 'text-slate-800'
                    }`}
                  >
                    {currentPlaca || '--- ---'}
                  </span>
                  {currentPlaca && (
                    <button
                      onClick={() => {
                        setCurrentPlaca('');
                        refocusInput();
                      }}
                      className="p-2 hover:bg-red-500/10 text-slate-600 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Chassi */}
              <div
                className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                  currentChassi
                    ? 'border-blue-500/30 bg-blue-500/5'
                    : 'border-slate-800 bg-slate-900/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                    Chassi / VIN
                  </span>
                  {currentChassi ? (
                    <CheckCircle2 size={16} className="text-blue-500" />
                  ) : (
                    <AlertCircle size={16} className="text-slate-700" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-2xl font-mono font-bold tracking-widest ${
                      currentChassi ? 'text-blue-400' : 'text-slate-800'
                    }`}
                  >
                    {currentChassi || '--- --- ---'}
                  </span>
                  {currentChassi && (
                    <button
                      onClick={() => {
                        setCurrentChassi('');
                        refocusInput();
                      }}
                      className="p-2 hover:bg-red-500/10 text-slate-600 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Action Bar / Salvar Button */}
            <div className="flex justify-end pt-4 border-t border-slate-800/60">
              <button
                onClick={handleSave}
                disabled={isSaving || !currentPlaca || !currentChassi}
                className={`
                  px-8 py-4 rounded-xl flex items-center gap-2 font-bold tracking-wider text-sm font-mono uppercase transition-all duration-300
                  ${
                    currentPlaca && currentChassi
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-[0.98]'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                  }
                `}
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                [ SALVAR COLETA ]
              </button>
            </div>
          </div>

          <StatsCards />
        </div>

        {/* Coluna Direita: Leituras Recentes */}
        <div className="lg:col-span-4">
          <div className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6 shadow-xl h-full flex flex-col min-h-[500px]">
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
  );
}
