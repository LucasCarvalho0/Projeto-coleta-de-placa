// ============================================================
// SERVIÇO DE EXPORTAÇÃO EXCEL - PLANILHA OPERACIONAL
// ============================================================

import * as XLSX from 'xlsx';
import { ScannedVehicle } from '@/types';

/**
 * Gera nome do arquivo com data atual
 */
function gerarNomeArquivo(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `OS_EMPLACAMENTO_${dd}${mm}${yyyy}.xlsx`;
}

/**
 * Converte índice numérico (0-based) em letra de coluna Excel: 0→A, 25→Z, 26→AA ...
 */
function colLetter(idx: number): string {
  let letter = '';
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

/**
 * Exporta lista de veículos para Excel com formatação profissional.
 * Inclui automaticamente qualquer campo extra mapeado na importação.
 */
export function exportarExcel(vehicles: ScannedVehicle[]): void {
  if (vehicles.length === 0) throw new Error('Nenhum veículo para exportar');

  // Ordenar por sequência
  const sorted = [...vehicles].sort((a, b) => a.seq - b.seq);

  // Descobrir todas as chaves extras presentes nos registros
  const extraKeysSet = new Set<string>();
  for (const v of sorted) {
    if (v.extraFields) Object.keys(v.extraFields).forEach(k => extraKeysSet.add(k));
  }
  const extraKeys = Array.from(extraKeysSet);

  // Montar linhas: campos fixos + extras + campos finais
  const rows = sorted.map((v) => {
    const row: Record<string, any> = {
      QTD: v.seq,
      COLETOR: v.coletor || '',
      VIN: v.vin,
      PLACA: v.placa === '-' ? '' : v.placa,
      MODELO: v.modelo === '-' ? '' : v.modelo,
      COR: v.cor === '-' ? '' : v.cor,
      VAGA: v.vaga === '-' ? '' : v.vaga,
      CLIENTE: v.cliente === '-' ? '' : v.cliente,
    };
    for (const key of extraKeys) {
      row[key] = v.extraFields?.[key] || '';
    }
    row['RETIRAR CHAVE'] = v.retirarChave || '';
    row['DOCUMENTO'] = v.documento || '';
    row['STATUS'] = v.status === 'OK' ? 'OK' : v.status === 'DUPLICADO' ? 'DUPLICADO' : 'NÃO ENCONTRADO';
    row['2 CHAVES NO VEÍCULO'] = v.duasChaves || '';
    return row;
  });

  // Total de colunas (8 fixas base + extras + 4 fixas finais)
  const totalCols = 8 + extraKeys.length + 4;

  // Criar workbook e sheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Larguras das colunas
  ws['!cols'] = [
    { wch: 6 },   // QTD
    { wch: 15 },  // COLETOR
    { wch: 20 },  // VIN
    { wch: 12 },  // PLACA
    { wch: 15 },  // MODELO
    { wch: 15 },  // COR
    { wch: 10 },  // VAGA
    { wch: 30 },  // CLIENTE
    ...extraKeys.map(() => ({ wch: 18 })), // colunas extras
    { wch: 15 },  // RETIRAR CHAVE
    { wch: 15 },  // DOCUMENTO
    { wch: 16 },  // STATUS
    { wch: 20 },  // 2 CHAVES NO VEÍCULO
  ];

  // Estilo do cabeçalho (linha 1)
  for (let i = 0; i < totalCols; i++) {
    const cellRef = `${colLetter(i)}1`;
    if (ws[cellRef]) {
      ws[cellRef].s = {
        fill: { fgColor: { rgb: '1D4ED8' } },
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top:    { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left:   { style: 'thin', color: { rgb: '000000' } },
          right:  { style: 'thin', color: { rgb: '000000' } },
        },
      };
    }
  }

  // Estilo das linhas de dados (cor por status)
  rows.forEach((row, rowIdx) => {
    const excelRow = rowIdx + 2; // linha 1 é cabeçalho

    let fillColor = 'F0FDF4'; // verde claro = OK
    let fontColor = '000000';
    if (row['STATUS'] === 'DUPLICADO') {
      fillColor = 'FEE2E2'; fontColor = '7F1D1D';
    } else if (row['STATUS'] === 'NÃO ENCONTRADO') {
      fillColor = 'FEF9C3'; fontColor = '713F12';
    }

    for (let i = 0; i < totalCols; i++) {
      const cellRef = `${colLetter(i)}${excelRow}`;
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      ws[cellRef].s = {
        fill: { fgColor: { rgb: fillColor } },
        font: { color: { rgb: fontColor }, sz: 10 },
        alignment: { vertical: 'center' },
        border: {
          top:    { style: 'thin', color: { rgb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
          left:   { style: 'thin', color: { rgb: 'E5E7EB' } },
          right:  { style: 'thin', color: { rgb: 'E5E7EB' } },
        },
      };
    }
  });

  XLSX.utils.book_append_sheet(wb, ws, 'EMPLACAMENTO');

  // Aba de resumo
  const summaryData: any[][] = [
    ['RELATÓRIO DE EMPLACAMENTO', ''],
    ['Data de geração:', new Date().toLocaleString('pt-BR')],
    ['', ''],
    ['RESUMO', ''],
    ['Total Coletados:', rows.length],
    ['OK:', rows.filter((r) => r['STATUS'] === 'OK').length],
    ['Duplicados:', rows.filter((r) => r['STATUS'] === 'DUPLICADO').length],
    ['Não Encontrados:', rows.filter((r) => r['STATUS'] === 'NÃO ENCONTRADO').length],
  ];
  if (extraKeys.length > 0) {
    summaryData.push(['', '']);
    summaryData.push(['CAMPOS EXTRAS INCLUÍDOS:', extraKeys.join(', ')]);
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'RESUMO');

  XLSX.writeFile(wb, gerarNomeArquivo(), { bookType: 'xlsx', compression: true });
}
