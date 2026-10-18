import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export interface BatchScanItem {
  placa: string;
  chassi: string;
  tipo?: string;
  modelo?: string;
  cor?: string;
  empresa?: string;
  renavam?: string;
}

// POST /api/scans/batch
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const items: BatchScanItem[] = Array.isArray(body) ? body : body.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum veículo fornecido para salvar no lote.' },
        { status: 400 }
      );
    }

    // Normalizar e desduplicar dentro do próprio lote enviado
    const validItems: BatchScanItem[] = [];
    const seenPlacasNoLote = new Set<string>();
    const duplicadosNoLote: string[] = [];

    for (const item of items) {
      const placa = item.placa?.toUpperCase().trim();
      const chassi = item.chassi?.toUpperCase().trim();

      if (!placa || !chassi) continue;

      if (seenPlacasNoLote.has(placa)) {
        duplicadosNoLote.push(placa);
        continue;
      }

      seenPlacasNoLote.add(placa);
      validItems.push({
        ...item,
        placa,
        chassi,
      });
    }

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum item com placa e chassi válidos no lote.' },
        { status: 400 }
      );
    }

    // Verificar anti-duplicidade no banco de dados (mesmo dia)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const todasPlacas = validItems.map((i) => i.placa);
    const jaSalvosHoje = await prisma.scan.findMany({
      where: {
        placa: { in: todasPlacas },
        createdAt: { gte: hoje },
      },
      select: { placa: true },
    });

    const placasJaSalvasSet = new Set(jaSalvosHoje.map((s: { placa: string }) => s.placa));

    const itensParaSalvar = validItems.filter(
      (item) => !placasJaSalvasSet.has(item.placa)
    );

    const itensIgnoradosDuplicadosHoje = validItems
      .filter((item) => placasJaSalvasSet.has(item.placa))
      .map((item) => item.placa);

    if (itensParaSalvar.length > 0) {
      const dataToInsert = itensParaSalvar.map((item) => ({
        tipo: item.tipo || 'ETIQUETA',
        placa: item.placa,
        chassi: item.chassi,
        modelo: item.modelo || null,
        cor: item.cor || null,
        empresa: item.empresa || null,
        renavam: item.renavam || null,
        operadorId: session.userId,
      }));

      await prisma.scan.createMany({
        data: dataToInsert,
      });
    }

    return NextResponse.json({
      success: true,
      totalEnviado: items.length,
      totalSalvo: itensParaSalvar.length,
      totalDuplicadosHoje: itensIgnoradosDuplicadosHoje.length,
      duplicadosHoje: itensIgnoradosDuplicadosHoje,
      duplicadosNoLote,
      mensagem: `${itensParaSalvar.length} veículos gravados com sucesso!`,
    });
  } catch (error: any) {
    console.error('Erro ao salvar lote de scans:', error);
    return NextResponse.json(
      { error: 'Erro interno ao gravar lote de coletas.' },
      { status: 500 }
    );
  }
}
