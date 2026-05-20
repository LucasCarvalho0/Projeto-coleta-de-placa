// ============================================================
// SERVIÇO DE IMPORTAÇÃO DA BASE NISSAN (.xlsx / .csv)
// ============================================================

import * as XLSX from 'xlsx';
import { ImportedBase, VehicleBase } from '@/types';

/**
 * Normaliza nome de coluna para comparação flexível
 */
function normalizeKey(key: string): string {
  return key
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Tenta encontrar o valor de uma coluna baseado em um mapeamento ou aliases
 */
function findValue(row: Record<string, any>, keyOrAliases: string | string[]): string {
  const aliases = Array.isArray(keyOrAliases) ? keyOrAliases.map(normalizeKey) : [normalizeKey(keyOrAliases)];
  
  for (const alias of aliases) {
    for (const key of Object.keys(row)) {
      if (normalizeKey(key) === alias) {
        return String(row[key] ?? '').trim();
      }
    }
  }
  return '';
}

export interface ExcelPreview {
  columns: string[];
  rows: Record<string, any>[];
  filename: string;
}

/**
 * Extrai colunas e primeiras linhas para preview e mapeamento
 */
export async function getExcelPreview(file: File): Promise<ExcelPreview> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Arquivo vazio');

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
          defval: '',
          raw: false,
        });

        if (rows.length === 0) throw new Error('Planilha sem dados');

        const columns = Object.keys(rows[0]);
        resolve({
          columns,
          rows: rows.slice(0, 10),
          filename: file.name
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

export interface ColumnMapping {
  vin: string;
  placa?: string;
  modelo?: string;
  cor?: string;
  vaga?: string;
  cliente?: string;
  /** Colunas extras definidas pelo usuário: label é o nome exibido, column é o nome da coluna na planilha */
  extraColumns?: { label: string; column: string }[];
}

/**
 * Converte arquivo .xlsx ou .csv em lista de objetos brutos
 */
export async function parseExcelFile(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Arquivo vazio');
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        resolve(rows);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Mescla dados de múltiplas fontes usando o VIN como chave
 */
export function mergeSources(
  sources: { data: Record<string, any>[]; mapping: ColumnMapping }[]
): { base: ImportedBase; count: number } {
  const mergedBase: ImportedBase = {};

  for (const source of sources) {
    const { data, mapping } = source;
    
    for (const row of data) {
      const vin = String(row[mapping.vin] || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

      if (!vin || vin.length < 10) continue;

      if (!mergedBase[vin]) {
        mergedBase[vin] = {
          vin,
          vaga: '-',
          placa: '-',
          modelo: '-',
          cor: '-',
          cliente: '-',
        };
      }

      // Atualizar campos mapeados nesta fonte se houver valor
      if (mapping.placa && row[mapping.placa]) mergedBase[vin].placa = String(row[mapping.placa]).trim().toUpperCase();
      if (mapping.modelo && row[mapping.modelo]) mergedBase[vin].modelo = String(row[mapping.modelo]).trim().toUpperCase();
      if (mapping.cor && row[mapping.cor]) mergedBase[vin].cor = String(row[mapping.cor]).trim().toUpperCase();
      if (mapping.vaga && row[mapping.vaga]) mergedBase[vin].vaga = String(row[mapping.vaga]).trim();
      if (mapping.cliente && row[mapping.cliente]) mergedBase[vin].cliente = String(row[mapping.cliente]).trim();

      // Campos extras personalizados
      if (mapping.extraColumns && mapping.extraColumns.length > 0) {
        if (!mergedBase[vin].extraFields) mergedBase[vin].extraFields = {};
        for (const extra of mapping.extraColumns) {
          if (extra.column && extra.label && row[extra.column] != null) {
            const val = String(row[extra.column]).trim();
            if (val) mergedBase[vin].extraFields![extra.label] = val;
          }
        }
      }
    }
  }

  return {
    base: mergedBase,
    count: Object.keys(mergedBase).length,
  };
}

/**
 * Fallback para o comportamento antigo (importación direta)
 */
export async function importarBase(file: File): Promise<{ base: ImportedBase; count: number }> {
  const rows = await parseExcelFile(file);
  const mapping: ColumnMapping = {
    vin: Object.keys(rows[0]).find(k => ['VIN', 'CHASSI', 'CHASSIS'].includes(normalizeKey(k))) || Object.keys(rows[0])[0],
    placa: Object.keys(rows[0]).find(k => ['PLACA'].includes(normalizeKey(k))),
    vaga: Object.keys(rows[0]).find(k => ['VAGA', 'BOX'].includes(normalizeKey(k))),
    cliente: Object.keys(rows[0]).find(k => ['CLIENTE', 'PROPRIETARIO'].includes(normalizeKey(k))),
  };

  return mergeSources([{ data: rows, mapping }]);
}
