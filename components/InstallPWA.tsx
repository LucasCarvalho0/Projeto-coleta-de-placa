'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verifica se já está instalado como PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Verifica se o iOS (Safari não suporta beforeinstallprompt)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;

    if (isIOS && !isInStandaloneMode) {
      // No iOS, mostrar banner com instrução manual
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detectar quando o app foi instalado
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Se já instalado ou o banner não deve aparecer, não renderiza nada
  if (isInstalled || !showBanner) return null;

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] animate-slide-up">
      <div className="max-w-lg mx-auto bg-slate-800/95 backdrop-blur-xl border border-slate-600/50 rounded-2xl p-4 shadow-2xl shadow-black/40">
        <div className="flex items-start gap-3">
          {/* App Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-700">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-black text-white text-sm">
              N
            </div>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">Instalar Nissan Scan</p>
            {isIOS ? (
              <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                Toque em{' '}
                <span className="inline-flex items-center bg-slate-700 rounded px-1.5 py-0.5 text-blue-300 font-medium">
                  Compartilhar ↑
                </span>
                {' '}e depois{' '}
                <span className="inline-flex items-center bg-slate-700 rounded px-1.5 py-0.5 text-blue-300 font-medium">
                  Adicionar à Tela Início
                </span>
              </p>
            ) : (
              <p className="text-slate-400 text-xs mt-0.5">
                Acesse offline direto da tela inicial
              </p>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors p-0.5"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Install button (not shown on iOS since it requires manual steps) */}
        {!isIOS && (
          <button
            onClick={handleInstall}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-all active:scale-[0.98]"
          >
            <Download size={16} />
            Instalar App
          </button>
        )}
      </div>
    </div>
  );
}
