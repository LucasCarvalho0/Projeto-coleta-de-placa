'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Se já foi instalado, não mostra
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-blue-600 text-white p-4 rounded-2xl shadow-2xl z-50 flex items-center justify-between border-2 border-blue-400/30 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-xl">
          <Download size={24} />
        </div>
        <div>
          <h4 className="font-bold text-sm">Instalar Aplicativo</h4>
          <p className="text-xs text-blue-100">Adicione à tela inicial para acesso rápido</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={handleInstallClick}
          className="bg-white text-blue-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-50 transition-colors"
        >
          Instalar
        </button>
        <button 
          onClick={() => setShowPrompt(false)}
          className="p-2 text-blue-200 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
