import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { matricula, senha } = await request.json();

    if (!matricula || !senha) {
      return NextResponse.json(
        { error: 'Matrícula e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar operador
    let operator = await prisma.operator.findUnique({
      where: { matricula },
    });

    // Se o operador não existir e a matrícula for a mestre, cria na hora
    if (!operator && matricula === '116221') {
      const hashedPassword = await bcrypt.hash(senha, 10);
      operator = await prisma.operator.create({
        data: {
          nome: 'Lucas Carvalho',
          matricula: '116221',
          senha: hashedPassword,
        },
      });
    }

    if (!operator) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(senha, operator.senha);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Criar sessão
    await createSession(operator.id, operator.matricula);

    return NextResponse.json({
      success: true,
      user: {
        id: operator.id,
        nome: operator.nome,
        matricula: operator.matricula,
      },
    });
  } catch (error: any) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
