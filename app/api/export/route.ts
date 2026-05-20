import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import ExcelJS from 'exceljs';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const placa = searchParams.get('placa');
    const chassi = searchParams.get('chassi');
    const operador = searchParams.get('operador');
    const data = searchParams.get('data');

    // Construir filtro
    const where: any = {};
    if (placa) where.placa = { contains: placa, mode: 'insensitive' };
    if (chassi) where.chassi = { contains: chassi, mode: 'insensitive' };
    if (operador) where.operador = { nome: { contains: operador, mode: 'insensitive' } };
    if (data) {
      const start = new Date(data);
      const end = new Date(data);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    const scans = await prisma.scan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        operador: {
          select: { nome: true, matricula: true }
        }
      }
    });

    // Criar Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Coletas');

    // Cabeçalhos
    worksheet.columns = [
      { header: 'PLACA', key: 'placa', width: 15 },
      { header: 'CHASSI', key: 'chassi', width: 25 },
    ];

    // Estilo dos cabeçalhos
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0000FF' } // Azul Nissan
    };

    // Adicionar dados
    scans.forEach((scan: any) => {
      worksheet.addRow({
        placa: scan.placa,
        chassi: scan.chassi,
      });
    });

    // Gerar Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=coletas_${new Date().toISOString().split('T')[0]}.xlsx`,
      },
    });

  } catch (error) {
    console.error('Erro no export:', error);
    return NextResponse.json({ error: 'Erro ao gerar Excel' }, { status: 500 });
  }
}
