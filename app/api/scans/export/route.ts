import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const scans = await prisma.scan.findMany({
      select: { placa: true, chassi: true },
      orderBy: { createdAt: 'desc' },
    });
    const header = 'Placa,Chassi\n';
const rows = scans.map((s: { placa: string; chassi: string }) => `${s.placa},${s.chassi}`).join('\n');
    const csv = header + rows;
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', 'attachment; filename="scans.csv"');
    return new Response(csv, { status: 200, headers });
  } catch (error) {
    console.error('Export error', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
