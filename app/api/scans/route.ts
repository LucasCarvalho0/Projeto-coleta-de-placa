import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/scans?placa=&chassi=&operador=&dataInicio=&dataFim=
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const placa = searchParams.get('placa') || '';
  const chassi = searchParams.get('chassi') || '';
  const operador = searchParams.get('operador') || '';
  const dataInicio = searchParams.get('dataInicio');
  const dataFim = searchParams.get('dataFim');

  const where: any = {};
  if (placa) where.placa = { contains: placa.toUpperCase(), mode: 'insensitive' };
  if (chassi) where.chassi = { contains: chassi.toUpperCase(), mode: 'insensitive' };
  if (operador) where.operador = { nome: { contains: operador, mode: 'insensitive' } };
  if (dataInicio || dataFim) {
    where.createdAt = {};
    if (dataInicio) where.createdAt.gte = new Date(dataInicio);
    if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
      where.createdAt.lte = fim;
    }
  }

  const [scans, totalGeral] = await Promise.all([
    prisma.scan.findMany({
      where,
      include: { operador: { select: { nome: true, matricula: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.scan.count(),
  ]);

  return NextResponse.json({ scans, totalGeral });
}

// POST /api/scans
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { tipo = 'ETIQUETA', placa, chassi, modelo, cor, empresa, renavam } = await request.json();

    if (!placa || !chassi) {
      return NextResponse.json({ error: 'Placa e chassi são obrigatórios' }, { status: 400 });
    }

    const placaUpper = placa.toUpperCase().trim();
    const chassiUpper = chassi.toUpperCase().trim();

    // Anti-duplicidade: mesma placa no mesmo dia
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const existente = await prisma.scan.findFirst({
      where: { placa: placaUpper, createdAt: { gte: hoje } },
    });
    if (existente) {
      return NextResponse.json(
        { error: `Placa ${placaUpper} já foi coletada hoje.`, duplicado: true },
        { status: 409 }
      );
    }

    const scan = await prisma.scan.create({
      data: {
        tipo,
        placa: placaUpper,
        chassi: chassiUpper,
        modelo: modelo || null,
        cor: cor || null,
        empresa: empresa || null,
        renavam: renavam || null,
        operadorId: session.userId,
      },
    });

    return NextResponse.json({ success: true, scan }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar scan:', error);
    return NextResponse.json({ error: 'Erro interno ao gravar coleta.' }, { status: 500 });
  }
}
