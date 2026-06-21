import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [totalHoje, ultima, totalGeral] = await Promise.all([
    prisma.scan.count({
      where: {
        operadorId: session.userId,
        createdAt: { gte: hoje },
      },
    }),
    prisma.scan.findFirst({
      where: { operadorId: session.userId },
      orderBy: { createdAt: 'desc' },
      include: { operador: true },
    }),
    prisma.scan.count(),
  ]);

  const operador = await prisma.operator.findUnique({
    where: { id: session.userId },
  });

  return (
    <DashboardClient
      totalHoje={totalHoje}
      totalGeral={totalGeral}
      ultimaPlaca={ultima?.placa ?? null}
      ultimoChassi={ultima?.chassi ?? null}
      operadorNome={operador?.nome ?? session.matricula}
      ultimaLeitura={ultima?.createdAt?.toISOString() ?? null}
    />
  );
}
