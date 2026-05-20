// ============================================================
// DADOS MOCK - PARA TESTES E DEMONSTRAÇÃO
// ============================================================

import { ImportedBase, ScannedVehicle } from '@/types';

export const mockBase: ImportedBase = {
  'JN1BBAF15A0000001': { vin: 'JN1BBAF15A0000001', vaga: '001', placa: 'ABC1D23', modelo: 'FRONTIER', cor: 'BRANCO', cliente: 'CLIENTE ALPHA LTDA' },
  'JN1BBAF15A0000002': { vin: 'JN1BBAF15A0000002', vaga: '002', placa: 'DEF2E34', modelo: 'KICKS', cor: 'PRATA', cliente: 'TRANSPORTES BETA SA' },
  'JN1BBAF15A0000003': { vin: 'JN1BBAF15A0000003', vaga: '003', placa: 'GHI3F45', modelo: 'SENTRA', cor: 'PRETO', cliente: 'LOGÍSTICA GAMMA ME' },
  'JN1BBAF15A0000004': { vin: 'JN1BBAF15A0000004', vaga: '004', placa: 'JKL4G56', modelo: 'VERSA', cor: 'CINZA', cliente: 'AUTO DELTA EIRELI' },
  'JN1BBAF15A0000005': { vin: 'JN1BBAF15A0000005', vaga: '005', placa: 'MNO5H67', modelo: 'FRONTIER', cor: 'AZUL', cliente: 'DISTRIBUIDORA ÉPSILON' },
  'JN1BBAF15A0000006': { vin: 'JN1BBAF15A0000006', vaga: '006', placa: 'PQR6I78', modelo: 'KICKS', cor: 'VERMELHO', cliente: 'ZETA COMÉRCIO LTDA' },
  'JN1BBAF15A0000007': { vin: 'JN1BBAF15A0000007', vaga: '007', placa: 'STU7J89', modelo: 'SENTRA', cor: 'BRANCO', cliente: 'ETA FROTA SA' },
  'JN1BBAF15A0000008': { vin: 'JN1BBAF15A0000008', vaga: '008', placa: 'VWX8K90', modelo: 'VERSA', cor: 'PRATA', cliente: 'THETA VEÍCULOS ME' },
  'JN1BBAF15A0000009': { vin: 'JN1BBAF15A0000009', vaga: '009', placa: 'YZA9L01', modelo: 'FRONTIER', cor: 'PRETO', cliente: 'IOTA TRANSPORTES' },
  'JN1BBAF15A0000010': { vin: 'JN1BBAF15A0000010', vaga: '010', placa: 'BCD0M12', modelo: 'KICKS', cor: 'CINZA', cliente: 'KAPPA AUTO LTDA' },
};

export const mockVehicles: ScannedVehicle[] = [
  {
    id: 'mock-1',
    seq: 1,
    vin: 'JN1BBAF15A0000001',
    placa: 'ABC1D23',
    vaga: '001',
    modelo: 'FRONTIER',
    cor: 'BRANCO',
    cliente: 'CLIENTE ALPHA LTDA',
    status: 'OK',
    rawCode: 'JN1BBAF15A0000001',
    timestamp: new Date(Date.now() - 120000),
    coletor: 'OP-DEMO',
  },
  {
    id: 'mock-2',
    seq: 2,
    vin: 'JN1BBAF15A0000002',
    placa: 'DEF2E34',
    vaga: '002',
    modelo: 'KICKS',
    cor: 'PRATA',
    cliente: 'TRANSPORTES BETA SA',
    status: 'OK',
    rawCode: 'JN1BBAF15A0000002',
    timestamp: new Date(Date.now() - 90000),
    coletor: 'OP-DEMO',
  },
  {
    id: 'mock-3',
    seq: 3,
    vin: 'JN1BBAF15A0000002',
    placa: 'DEF2E34',
    vaga: '002',
    modelo: 'KICKS',
    cor: 'PRATA',
    cliente: 'TRANSPORTES BETA SA',
    status: 'DUPLICADO',
    rawCode: 'JN1BBAF15A0000002',
    timestamp: new Date(Date.now() - 60000),
    coletor: 'OP-DEMO',
  },
  {
    id: 'mock-4',
    seq: 4,
    vin: 'XXXXXXXXXXXXXXXYZ',
    placa: '-',
    vaga: '-',
    modelo: '-',
    cor: '-',
    cliente: '-',
    status: 'NAO_ENCONTRADO',
    rawCode: 'XXXXXXXXXXXXXXXYZ',
    timestamp: new Date(Date.now() - 30000),
    coletor: 'OP-DEMO',
  },
];

/**
 * Gera base mock para download como arquivo de exemplo
 */
export const mockBaseRows = [
  ['VIN', 'VAGA', 'PLACA', 'CLIENTE'],
  ['JN1BBAF15A0000001', '001', 'ABC1D23', 'CLIENTE ALPHA LTDA'],
  ['JN1BBAF15A0000002', '002', 'DEF2E34', 'TRANSPORTES BETA SA'],
  ['JN1BBAF15A0000003', '003', 'GHI3F45', 'LOGÍSTICA GAMMA ME'],
  ['JN1BBAF15A0000004', '004', 'JKL4G56', 'AUTO DELTA EIRELI'],
  ['JN1BBAF15A0000005', '005', 'MNO5H67', 'DISTRIBUIDORA ÉPSILON'],
];
