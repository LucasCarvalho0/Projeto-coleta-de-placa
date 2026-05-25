import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import ExcelJS from 'exceljs';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dataInicio = searchParams.get('dataInicio');
  const dataFim = searchParams.get('dataFim');

  const where: any = {};
  if (dataInicio || dataFim) {
    where.createdAt = {};
    if (dataInicio) where.createdAt.gte = new Date(dataInicio);
    if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
      where.createdAt.lte = fim;
    }
  }

  const scans = await prisma.scan.findMany({
    where,
    include: { operador: { select: { nome: true, matricula: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // Criar workbook Excel
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nissan Scan';
  const sheet = workbook.addWorksheet('Coletas');

  // Estilo do cabeçalho
  sheet.columns = [
    { header: 'Data', key: 'data', width: 14 },
    { header: 'Hora', key: 'hora', width: 10 },
    { header: 'Operador', key: 'operador', width: 22 },
    { header: 'Matrícula', key: 'matricula', width: 14 },
    { header: 'Placa', key: 'placa', width: 12 },
    { header: 'Chassi (VIN)', key: 'chassi', width: 22 },
    { header: 'Tipo de Leitura', key: 'tipo', width: 18 },
    { header: 'Modelo', key: 'modelo', width: 20 },
    { header: 'Cor', key: 'cor', width: 16 },
    { header: 'Empresa', key: 'empresa', width: 20 },
    { header: 'RENAVAM', key: 'renavam', width: 14 },
  ];

  // Formatar cabeçalho
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FFE53935' } },
    };
  });
  headerRow.height = 28;

  // Adicionar dados
  scans.forEach((scan: any, i: number) => {
    const dt = new Date(scan.createdAt);
    const row = sheet.addRow({
      data: dt.toLocaleDateString('pt-BR'),
      hora: dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      operador: scan.operador.nome,
      matricula: scan.operador.matricula,
      placa: scan.placa,
      chassi: scan.chassi,
      tipo: scan.tipo,
      modelo: scan.modelo || '',
      cor: scan.cor || '',
      empresa: scan.empresa || '',
      renavam: scan.renavam || '',
    });
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (i % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      }
    });
    row.height = 22;
  });

  // Gerar buffer
  const buffer = await workbook.xlsx.writeBuffer();

  const hoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="coletas_${hoje}.xlsx"`,
    },
  });
}
