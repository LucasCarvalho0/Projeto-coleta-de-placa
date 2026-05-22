import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { placa, chassi, tipo = 'ETIQUETA', renavam } = await request.json();

    if (!placa || !chassi) {
      return NextResponse.json(
        { error: 'Placa e Chassi são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar duplicidade de placa
    const existingPlaca = await prisma.scan.findUnique({
      where: { placa },
    });
    if (existingPlaca) {
      return NextResponse.json(
        { error: 'Placa já coletada', type: 'DUPLICATE_PLACA' },
        { status: 409 }
      );
    }

    // Verificar duplicidade de chassi
    const existingChassi = await prisma.scan.findUnique({
      where: { chassi },
    });
    if (existingChassi) {
      return NextResponse.json(
        { error: 'Chassi já coletado', type: 'DUPLICATE_CHASSI' },
        { status: 409 }
      );
    }

    // Salvar coleta
    const scan = await prisma.scan.create({
      data: {
        placa,
        chassi,
        tipo,
        renavam: renavam || null,
        operadorId: session.userId,
      },
      include: {
        operador: {
          select: { nome: true }
        }
      }
    });

    // Calcular estatísticas atualizadas
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, dia, operador] = await Promise.all([
      prisma.scan.count(),
      prisma.scan.count({ where: { createdAt: { gte: today } } }),
      prisma.scan.count({ where: { operadorId: session.userId } }),
    ]);

    return NextResponse.json({
      success: true,
      scan: {
        id: scan.id,
        placa: scan.placa,
        chassi: scan.chassi,
        operadorNome: scan.operador.nome,
        createdAt: scan.createdAt,
        status: 'SUCCESS'
      },
      stats: { total, dia, operador }
    });

  } catch (error: any) {
    console.error('Erro ao salvar coleta:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar no banco de dados' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const chassiQuery = searchParams.get('chassi');
let scansData: any[] = [];
    if (chassiQuery) {
      const scan = await prisma.scan.findFirst({
        where: { chassi: chassiQuery },
        include: { operador: { select: { nome: true } } },
      });
      scansData = scan ? [scan] : [];
    } else {
      scansData = await prisma.scan.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { operador: { select: { nome: true } } }
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, dia, operador] = await Promise.all([
      prisma.scan.count(),
      prisma.scan.count({ where: { createdAt: { gte: today } } }),
      prisma.scan.count({ where: { operadorId: session.userId } }),
    ]);

    return NextResponse.json({
      scans: scansData.map((s: any) => ({
        id: s.id,
        placa: s.placa,
        chassi: s.chassi,
        operadorNome: s.operador.nome,
        createdAt: s.createdAt,
        status: 'SUCCESS'
      })),
      stats: { total, dia, operador }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar coletas' }, { status: 500 });
  }
}
