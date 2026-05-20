'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Scan, Loader2, CheckCircle2, AlertCircle, Trash2, FileText, Tag } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { parserCRLV, playBeep } from '@/utils/scanner';
import toast from 'react-hot-toast';

export function ScannerInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const { 
    scanMode, setScanMode,
    currentPlaca, currentChassi, currentRenavam,
    setCurrentPlaca, setCurrentChassi, setCurrentRenavam,
    resetCurrent, addRecentScan, setStats
  } = useAppStore();

  // Foco automático e contínuo
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

  // Salvar automaticamente quando a regra for cumprida
  useEffect(() => {
    if (isSaving) return;

    if (scanMode === 'ETIQUETA' && currentPlaca && currentChassi) {
      saveScan();
    } else if (scanMode === 'CRLV' && currentPlaca && currentChassi && currentRenavam) {
      saveScan();
    }
  }, [currentPlaca, currentChassi, currentRenavam, scanMode, isSaving]);

  const saveScan = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          placa: currentPlaca, 
          chassi: currentChassi,
          renavam: currentRenavam || undefined,
          tipo: scanMode
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

  const handleProcess = (raw: string) => {
    const value = raw.trim().toUpperCase();
    if (!value) return;

    const resultado = parserCRLV(value);

    let foundSomething = false;

    if (resultado.placa) {
      if (currentPlaca !== resultado.placa) {
        setCurrentPlaca(resultado.placa);
        foundSomething = true;
      }
    }

    if (resultado.chassi) {
      if (currentChassi !== resultado.chassi) {
        setCurrentChassi(resultado.chassi);
        foundSomething = true;
      }
    }

    if (resultado.renavam) {
      if (currentRenavam !== resultado.renavam) {
        setCurrentRenavam(resultado.renavam);
        foundSomething = true;
      }
    }

    if (foundSomething) {
      playBeep('success');
    } else if (resultado.tipo === 'UNKNOWN') {
      toast.error('Código não reconhecido no modo atual');
      playBeep('error');
    } else {
      toast.error('Dado já inserido ou lido novamente');
      playBeep('warning');
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
    <div className="space-y-6">
      {/* Seletor de Modo */}
      <div className="flex gap-4 p-2 bg-slate-900/50 rounded-2xl border border-slate-800">
        <button
          onClick={() => { setScanMode('ETIQUETA'); resetCurrent(); refocusInput(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold tracking-widest text-sm transition-all ${
            scanMode === 'ETIQUETA' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Tag size={18} />
          MODO ETIQUETA
        </button>
        <button
          onClick={() => { setScanMode('CRLV'); resetCurrent(); refocusInput(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold tracking-widest text-sm transition-all ${
            scanMode === 'CRLV' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <FileText size={18} />
          MODO CRLV (QR CODE)
        </button>
      </div>

      {/* Input de Leitura */}
      <div className="relative group">
        <div className={`
          relative rounded-2xl border-2 transition-all duration-300 shadow-2xl 
          ${isSaving ? 'border-blue-500 bg-blue-500/5 animate-pulse' : 'border-slate-700 bg-slate-900/50 hover:border-slate-500 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10'}
        `}>
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
            placeholder={isSaving ? "SALVANDO NO BANCO..." : scanMode === 'ETIQUETA' ? "BIPE A ETIQUETA (PLACA/CHASSI)..." : "BIPE O QR CODE DO CRLV..."}
            className="w-full h-20 bg-transparent pl-20 pr-6 text-2xl font-mono text-white placeholder-slate-700 focus:outline-none tracking-[0.2em] uppercase"
            autoComplete="off"
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Visualização de Status dos Campos */}
      <div className={`grid grid-cols-1 gap-4 ${scanMode === 'CRLV' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {/* Card Placa */}
        <div className={`p-6 rounded-2xl border-2 transition-all ${currentPlaca ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/30'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Veículo / Placa</span>
            {currentPlaca ? <CheckCircle2 size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-slate-700" />}
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-mono font-bold tracking-widest ${currentPlaca ? 'text-emerald-400' : 'text-slate-800'}`}>
              {currentPlaca || '--- ---'}
            </span>
            {currentPlaca && (
              <button onClick={() => setCurrentPlaca('')} className="p-2 hover:bg-red-500/10 text-slate-600 hover:text-red-500 rounded-lg transition-colors">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Card Chassi */}
        <div className={`p-6 rounded-2xl border-2 transition-all ${currentChassi ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-slate-800 bg-slate-900/30'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Chassi / VIN</span>
            {currentChassi ? <CheckCircle2 size={16} className="text-indigo-500" /> : <AlertCircle size={16} className="text-slate-700" />}
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-mono font-bold tracking-widest ${currentChassi ? 'text-indigo-400' : 'text-slate-800'}`}>
              {currentChassi || '--- --- ---'}
            </span>
            {currentChassi && (
              <button onClick={() => setCurrentChassi('')} className="p-2 hover:bg-red-500/10 text-slate-600 hover:text-red-500 rounded-lg transition-colors">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Card Renavam (Apenas CRLV) */}
        {scanMode === 'CRLV' && (
          <div className={`p-6 rounded-2xl border-2 transition-all ${currentRenavam ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800 bg-slate-900/30'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Renavam</span>
              {currentRenavam ? <CheckCircle2 size={16} className="text-amber-500" /> : <AlertCircle size={16} className="text-slate-700" />}
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-mono font-bold tracking-widest ${currentRenavam ? 'text-amber-400' : 'text-slate-800'}`}>
                {currentRenavam || '--- ---'}
              </span>
              {currentRenavam && (
                <button onClick={() => setCurrentRenavam('')} className="p-2 hover:bg-red-500/10 text-slate-600 hover:text-red-500 rounded-lg transition-colors">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
