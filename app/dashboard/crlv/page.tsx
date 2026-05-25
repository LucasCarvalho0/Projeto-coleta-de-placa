'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, CheckCircle2, XCircle, RotateCcw, ArrowLeft, Camera } from 'lucide-react';
import { parserCRLV } from '@/app/lib/parsers';
import toast from 'react-hot-toast';

type ScanState = 'lendo' | 'sucesso' | 'invalido';

interface Parsed {
  placa: string;
  chassi: string;
  renavam?: string;
}

export default function CrlvPage() {
  const router = useRouter();
  const [scanState, setScanState] = useState<ScanState>('lendo');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Ref para manter uma referência estável ao scanner
  // Usamos any porque o tipo vem do import dinâmico
  const scannerRef = useRef<any>(null);
  const scanStateRef = useRef<ScanState>(scanState);

  // Manter scanStateRef sincronizado
  useEffect(() => {
    scanStateRef.current = scanState;
  }, [scanState]);

  // Marcar como montado no client
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleScan = useCallback((raw: string) => {
    if (scanStateRef.current !== 'lendo') return;
    if (!raw) return;

    // Para o scanner após leitura bem sucedida
    const scanner = scannerRef.current;
    if (scanner && scanner.isScanning) {
      scanner.stop().catch(console.error);
    }

    const data = parserCRLV(raw);
    if (!data.placa || !data.chassi) {
      setScanState('invalido');
      setTimeout(() => {
        setScanState('lendo');
        setCameraKey((k) => k + 1);
      }, 3000);
      return;
    }
    setParsed(data);
    setScanState('sucesso');
  }, []);

  // Inicializar o scanner com import dinâmico
  useEffect(() => {
    if (!mounted) return;
    if (scanState !== 'lendo') return;

    let isMounted = true;
    setCameraError(null);

    // Pequeno delay para garantir que a div #reader está no DOM
    const initTimeout = setTimeout(async () => {
      if (!isMounted) return;

      try {
        // Import dinâmico - evita SSR
        const { Html5Qrcode } = await import('html5-qrcode');

        if (!isMounted) return;

        // Verifica se a div #reader existe
        const readerEl = document.getElementById('reader');
        if (!readerEl) {
          console.error('Div #reader não encontrada no DOM');
          return;
        }

        const scanner = new Html5Qrcode('reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText: string) => {
            if (!isMounted) return;
            handleScan(decodedText);
          },
          () => {
            // Ignora erros de "QR code não encontrado no frame"
          }
        );
      } catch (err: any) {
        console.error('Camera start error:', err);
        if (isMounted) {
          const msg = err?.message || String(err);
          if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
            setCameraError('Permissão de câmera negada. Verifique as configurações do navegador.');
          } else if (msg.includes('NotFoundError') || msg.includes('Requested device not found')) {
            setCameraError('Nenhuma câmera encontrada neste dispositivo.');
          } else if (msg.includes('NotReadableError')) {
            setCameraError('A câmera está sendo usada por outro aplicativo.');
          } else {
            setCameraError('Erro ao abrir câmera. Verifique se deu permissão e se a conexão é HTTPS.');
          }
          toast.error('Erro ao abrir câmera. Verifique se deu permissão e se a conexão é segura (HTTPS).', { duration: 5000 });
        }
      }
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(initTimeout);
      const scanner = scannerRef.current;
      if (scanner) {
        if (scanner.isScanning) {
          scanner.stop()
            .then(() => {
              try { scanner.clear(); } catch {}
            })
            .catch(console.error);
        } else {
          try { scanner.clear(); } catch {}
        }
        scannerRef.current = null;
      }
    };
  }, [mounted, cameraKey, scanState, handleScan]);

  const handleConfirm = async () => {
    if (!parsed) return;
    setLoading(true);
    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'CRLV',
          placa: parsed.placa,
          chassi: parsed.chassi,
          renavam: parsed.renavam,
        }),
      });
      const json = await res.json();
      if (res.status === 409) {
        toast(`⚠️ Placa ${parsed.placa} já coletada hoje!`, { icon: '⚠️' });
      } else if (!res.ok) {
        toast.error(json.error || 'Erro ao salvar.');
      } else {
        toast.success('✅ Leitura CRLV salva com sucesso!');
        handleRefazer();
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefazer = () => {
    setParsed(null);
    setCameraError(null);
    setScanState('lendo');
    setCameraKey((k) => k + 1);
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
            <QrCode size={24} className="text-blue-400" />
            Leitura QR Code CRLV-e
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Aponte a câmera para o QR Code do documento CRLV-e
          </p>
        </div>
      </div>

      {/* Scanner */}
      {scanState === 'lendo' && (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border-2 border-blue-600/30 shadow-lg shadow-blue-900/20 bg-black min-h-[300px]">
            {/* O html5-qrcode injetará a tag <video> dentro desta div */}
            <div id="reader" key={cameraKey} className="w-full" style={{ minHeight: '300px' }} />
            
            {/* overlay de guia */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-blue-400/60 rounded-xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
              </div>
            </div>

            {/* Erro de câmera */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
                <Camera size={40} className="text-red-400 mb-3" />
                <p className="text-red-400 font-semibold mb-2">Câmera indisponível</p>
                <p className="text-slate-400 text-sm mb-4">{cameraError}</p>
                <button
                  onClick={handleRefazer}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all"
                >
                  <RotateCcw size={16} />
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
          {!cameraError && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-slate-800 rounded-full px-4 py-2 text-xs text-slate-400">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                Câmera ativa — aguardando QR Code
              </div>
            </div>
          )}
        </div>
      )}

      {/* QR inválido */}
      {scanState === 'invalido' && (
        <div className="bg-slate-900 border border-red-600/30 rounded-2xl p-10 text-center">
          <XCircle size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-xl font-semibold text-red-400">❌ QR Code inválido</p>
          <p className="text-slate-400 mt-2">Não foi possível extrair placa e chassi. Continuando...</p>
        </div>
      )}

      {/* Sucesso */}
      {scanState === 'sucesso' && parsed && (
        <div className="bg-slate-900 border border-green-600/30 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 size={28} className="text-green-400" />
            <span className="text-green-400 font-semibold text-lg">QR Code lido com sucesso!</span>
          </div>

          <div className="space-y-3 mb-8">
            <div className="bg-slate-800 rounded-xl px-5 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Placa</p>
              <p className="text-3xl font-bold font-mono tracking-widest text-white">{parsed.placa}</p>
            </div>
            <div className="bg-slate-800 rounded-xl px-5 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Chassi (VIN)</p>
              <p className="text-xl font-bold font-mono text-white">{parsed.chassi}</p>
            </div>
            {parsed.renavam && (
              <div className="bg-slate-800 rounded-xl px-5 py-3">
                <p className="text-xs text-slate-500 mb-0.5">RENAVAM</p>
                <p className="text-sm font-mono text-slate-300">{parsed.renavam}</p>
              </div>
            )}
          </div>

          <p className="text-slate-400 text-sm text-center mb-5">
            Verifique os dados e confirme a coleta.
          </p>

          <div className="flex gap-3">
            <button
              id="btn-confirmar-crlv"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {loading ? 'Salvando...' : '✅ Confirmar'}
            </button>
            <button
              id="btn-refazer"
              onClick={handleRefazer}
              disabled={loading}
              className="flex items-center gap-2 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3.5 rounded-xl transition-all"
            >
              <RotateCcw size={16} />
              Refazer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
