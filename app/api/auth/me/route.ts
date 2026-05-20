import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const operator = await prisma.operator.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      nome: true,
      matricula: true,
    },
  });

  if (!operator) {
    return NextResponse.json({ error: 'Operador não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ user: operator });
}
