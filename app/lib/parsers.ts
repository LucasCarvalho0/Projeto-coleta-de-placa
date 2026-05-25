export const regexPlaca = /[A-Z]{3}[0-9][A-Z0-9][0-9]{2}/i;
export const regexChassi = /[A-HJ-NPR-Z0-9]{17}/i;

/** Parse raw barcode text from etiqueta */
export const parserEtiqueta = (texto: string) => {
  const placa = texto.match(regexPlaca)?.[0] ?? '';
  const chassi = texto.match(regexChassi)?.[0] ?? '';

  // Tenta extrair modelo, cor, empresa de formatos comuns
  const modeloMatch = texto.match(/MODELO[:\s]+([^\n\r|]+)/i);
  const corMatch = texto.match(/COR[:\s]+([^\n\r|]+)/i);
  const empresaMatch = texto.match(/EMPRESA[:\s]+([^\n\r|]+)/i);

  return {
    placa,
    chassi,
    modelo: modeloMatch?.[1]?.trim() ?? '',
    cor: corMatch?.[1]?.trim() ?? '',
    empresa: empresaMatch?.[1]?.trim() ?? '',
  };
};

/** Parse raw QR Code text from CRLV-e */
export const parserCRLV = (texto: string) => {
  const placa = texto.match(regexPlaca)?.[0] ?? '';
  const chassi = texto.match(regexChassi)?.[0] ?? '';
  const renavam = texto.match(/\b\d{9,11}\b/)?.[0] ?? '';
  return { placa, chassi, renavam };
};
