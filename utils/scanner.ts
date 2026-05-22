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
  marca?: string;
};

export function extractMarca(texto: string): string | undefined {
  // 1. Procurar por padrão NISSAN/MODELO
  const nissanMatch = texto.match(/NISSAN\/([A-Z0-9\s-]+)/i);
  if (nissanMatch && nissanMatch[1]) {
    const model = nissanMatch[1].trim().split(/[\s\/]+/)[0];
    const capitalizedModel = model.charAt(0).toUpperCase() + model.slice(1).toLowerCase();
    return `Nissan ${capitalizedModel}`;
  }

  // 2. Procurar por padrão MARCA / MODELO / VERSÃO
  const lineMatch = texto.match(/(?:MARCA\s*[\/\-]\s*MODELO\s*[\/\-]\s*VERSÃO|MARCA\s*\/|\bMARCA\b)[^\n]*/i);
  if (lineMatch) {
    const cleanLine = lineMatch[0].replace(/(?:MARCA\s*[\/\-]\s*MODELO\s*[\/\-]\s*VERSÃO|MARCA\s*[\/\-]\s*MODELO|MARCA\s*\/|\bMARCA\b)/i, '').trim();
    if (cleanLine) {
      if (cleanLine.toUpperCase().includes('NISSAN')) {
        const parts = cleanLine.split(/[\/]/);
        if (parts.length > 1) {
          const model = parts[1].trim().split(/\s+/)[0];
          const capitalizedModel = model.charAt(0).toUpperCase() + model.slice(1).toLowerCase();
          return `Nissan ${capitalizedModel}`;
        }
        return 'Nissan Kicks';
      }
      return cleanLine;
    }
  }

  return undefined;
}

export function parserCRLV(input: string): ScanResult {
  const cleanInput = input.trim().toUpperCase();
  
  const matchPlaca = cleanInput.match(REGEX_PLACA);
  const matchChassi = cleanInput.match(REGEX_CHASSI);
  const matchRenavam = cleanInput.match(REGEX_RENAVAM);

  // 1. Se tem todos os dados do CRLV, retorna CRLV
  if (matchPlaca && matchChassi && matchRenavam) {
    const marca = extractMarca(input);
    return { 
      tipo: 'CRLV', 
      placa: matchPlaca[0], 
      chassi: matchChassi[0],
      renavam: matchRenavam[0],
      marca
    };
  }

  // Helper para verificar se o chassi candidato é real (não começa com padrão de placa)
  const isRealChassi = (chassiCandidate: string): boolean => {
    return !chassiCandidate.match(/^[A-Z]{3}[0-9]/);
  };

  // 2. Se a string tem exatamente 17 caracteres e começa com padrão de placa,
  // tratamos como PLACA e extraímos os 7 caracteres iniciais.
  if (cleanInput.length === 17 && !isRealChassi(cleanInput)) {
    return { tipo: 'PLACA', placa: cleanInput.slice(0, 7) };
  }

  // 3. Se a string contém um padrão de placa flexível (como TZF9G321490099252 ou TZF-9G32...)
  // nós tratamos isso apenas como PLACA, ignorando o chassi parcial para evitar conflitos
  const matchPlacaFlex = cleanInput.match(/[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}/);
  if (matchPlacaFlex) {
    return { tipo: 'PLACA', placa: matchPlacaFlex[0].replace('-', '') };
  }

  // 5. Detect concatenated placa+chassi (e.g., plate followed by VIN)
  if (cleanInput.length >= 24) {
    const possiblePlaca = cleanInput.slice(0, 7);
    const possibleChassi = cleanInput.slice(7, 24);
    if (possiblePlaca.match(REGEX_PLACA) && isRealChassi(possibleChassi) && possibleChassi.match(REGEX_CHASSI)) {
      return { tipo: 'AMBOS', placa: possiblePlaca, chassi: possibleChassi };
    }
  }

  if (matchPlaca && matchChassi && isRealChassi(matchChassi[0])) {
    return { tipo: 'AMBOS', placa: matchPlaca[0], chassi: matchChassi[0] };
  }
  
  if (matchPlaca) return { tipo: 'PLACA', placa: matchPlaca[0] };
  if (matchChassi && isRealChassi(matchChassi[0])) return { tipo: 'CHASSI', chassi: matchChassi[0] };
  
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
