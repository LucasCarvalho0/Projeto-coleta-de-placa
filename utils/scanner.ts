/**
 * Utilitários para detecção e processamento de scanner
 */

export const REGEX_PLACA = /\b[A-Z]{3}[0-9][A-Z0-9][0-9]{2}\b/;
export const REGEX_CHASSI = /\b[A-HJ-NPR-Z0-9]{17}\b/;
export const REGEX_RENAVAM = /\b\d{11}\b/;

export type ScanResult = {
  tipo: 'PLACA' | 'CHASSI' | 'UNKNOWN' | 'AMBOS' | 'CRLV';
  placa?: string;
  chassi?: string;
  renavam?: string;
};

export function parserCRLV(input: string): ScanResult {
  const cleanInput = input.trim().toUpperCase();
  
  const matchPlaca = cleanInput.match(REGEX_PLACA);
  const matchChassi = cleanInput.match(REGEX_CHASSI);
  const matchRenavam = cleanInput.match(REGEX_RENAVAM);

  if (matchPlaca && matchChassi && matchRenavam) {
    return { 
      tipo: 'CRLV', 
      placa: matchPlaca[0], 
      chassi: matchChassi[0],
      renavam: matchRenavam[0]
    };
  }

  if (matchPlaca && matchChassi) {
    return { tipo: 'AMBOS', placa: matchPlaca[0], chassi: matchChassi[0] };
  }
  
  if (matchPlaca) return { tipo: 'PLACA', placa: matchPlaca[0] };
  if (matchChassi) return { tipo: 'CHASSI', chassi: matchChassi[0] };
  
  return { tipo: 'UNKNOWN' };
}

/**
 * Toca sons de feedback baseados no status
 */
export function playBeep(type: 'success' | 'error' | 'warning') {
  if (typeof window === 'undefined') return;

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (type === 'success') {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'error') {
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
  } else {
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
  }
}

/**
 * Formata data e hora para exibição
 */
export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
