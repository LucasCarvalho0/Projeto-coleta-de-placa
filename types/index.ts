// ============================================================
// TIPOS CENTRAIS DO SISTEMA DE COLETA DE PLACAS - NISSAN
// ============================================================

export type ScanStatus = 'OK' | 'DUPLICADO' | 'NAO_ENCONTRADO';

export interface VehicleBase {
  vin: string;
  vaga: string;
  placa: string;
  modelo: string;
  cor: string;
  cliente: string;
  /** Campos extras mapeados pelo usuário durante a importação */
  extraFields?: Record<string, string>;
}

export interface ScannedVehicle {
  id: string;
  seq: number;
  vin: string;
  placa: string;
  vaga: string;
  modelo: string;
  cor: string;
  cliente: string;
  /** Campos extras mapeados pelo usuário durante a importação */
  extraFields?: Record<string, string>;
  status: ScanStatus;
  rawCode: string;
  timestamp: Date;
  coletor?: string;
  retirarChave?: string;
  documento?: string;
  duasChaves?: string;
}

export interface ScanStats {
  total: number;
  ok: number;
  duplicados: number;
  naoEncontrados: number;
}

export interface ImportedBase {
  [vin: string]: VehicleBase;
}

export interface ExportRow {
  QTD: number;
  COLETOR: string;
  VIN: string;
  PLACA: string;
  MODELO: string;
  COR: string;
  VAGA: string;
  CLIENTE: string;
  'RETIRAR CHAVE': string;
  DOCUMENTO: string;
  STATUS: string;
  '2 CHAVES NO VEÍCULO': string;
}
