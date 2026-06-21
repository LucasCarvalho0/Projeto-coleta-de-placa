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

  const res: ScanResult = { tipo: 'UNKNOWN' };
  let chassiStr = cleanInput;

  // Extrair Renavam (11 dígitos inteiros)
  const matchRenavam = cleanInput.match(/\b\d{11}\b/);
  if (matchRenavam) {
    res.renavam = matchRenavam[0];
  }

  // Extrair Placa flexível e removê-la para não interferir na busca do chassi
  const matchPlacaFlex = cleanInput.match(/[A-Z]{3}[\s-]?[0-9][A-Z0-9][0-9]{2}/);
  if (matchPlacaFlex) {
    res.placa = matchPlacaFlex[0].replace(/[\s-]/g, '');
    chassiStr = cleanInput.replace(matchPlacaFlex[0], ' ');
  }

  // Extrair Chassi nos caracteres restantes
  const matchChassi = chassiStr.match(/[A-HJ-NPR-Z0-9]{17}/);
  if (matchChassi && isRealChassi(matchChassi[0])) {
    res.chassi = matchChassi[0];
  }

  // Fallback: Se não achou placa, mas a string tem 17 caracteres começando com padrão de placa
  if (!res.placa && cleanInput.length === 17 && !isRealChassi(cleanInput)) {
    res.placa = cleanInput.slice(0, 7);
  }

  // Definir o tipo baseado no que foi encontrado
  if (res.placa && res.chassi && res.renavam) {
    res.tipo = 'CRLV';
    res.marca = extractMarca(input);
  } else if (res.placa && res.chassi) {
    res.tipo = 'AMBOS';
  } else if (res.placa) {
    res.tipo = 'PLACA';
  } else if (res.chassi) {
    res.tipo = 'CHASSI';
  }

  return res;
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
