import { create } from 'zustand';

export interface ScanRecord {
  id?: number;
  placa: string;
  chassi: string;
  renavam?: string;
  tipo: string;
  operadorNome: string;
  createdAt: string;
  status: 'SUCCESS' | 'DUPLICATE' | 'PENDING';
}

interface AppStore {
  // Configuração
  scanMode: 'ETIQUETA' | 'CRLV';
  setScanMode: (mode: 'ETIQUETA' | 'CRLV') => void;

  // Estado de Coleta Atual
  currentPlaca: string;
  currentChassi: string;
  currentRenavam: string;
  
  // Histórico em Tempo Real (UI)
  recentScans: ScanRecord[];
  
  // Estatísticas
  stats: {
    total: number;
    duplicados: number;
    operador: number;
    dia: number;
  };

  // Ações
  setCurrentPlaca: (placa: string) => void;
  setCurrentChassi: (chassi: string) => void;
  setCurrentRenavam: (renavam: string) => void;
  addRecentScan: (scan: ScanRecord) => void;
  setStats: (stats: any) => void;
  resetCurrent: () => void;
  loadInitialData: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  scanMode: 'ETIQUETA',
  setScanMode: (mode) => set({ scanMode: mode }),

  currentPlaca: '',
  currentChassi: '',
  currentRenavam: '',
  recentScans: [],
  stats: {
    total: 0,
    duplicados: 0,
    operador: 0,
    dia: 0
  },

  setCurrentPlaca: (placa) => set({ currentPlaca: placa }),
  setCurrentChassi: (chassi) => set({ currentChassi: chassi }),
  setCurrentRenavam: (renavam) => set({ currentRenavam: renavam }),

  addRecentScan: (scan) => {
    const newList = [scan, ...get().recentScans].slice(0, 50); // Manter os últimos 50
    set({ recentScans: newList });
  },

  setStats: (stats) => set({ stats: { ...get().stats, ...stats } }),

  resetCurrent: () => set({ currentPlaca: '', currentChassi: '', currentRenavam: '' }),

  loadInitialData: async () => {
    try {
      const res = await fetch('/api/scans?limit=10');
      if (res.ok) {
        const data = await res.json();
        set({ 
          recentScans: data.scans,
          stats: data.stats
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  }
}));
