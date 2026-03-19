import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { optedOut } = await req.json();
    const candidate = await prisma.candidate.update({
      where: { id: params.id },
      // Cast to any so this compiles even if the generated
      // Prisma Client types have not yet picked up the new field.
      data: { optedOut: Boolean(optedOut) } as any,
    });
    return NextResponse.json(candidate);
  } catch (error) {
    console.error('opted-out error:', error);
    return NextResponse.json(
      { error: 'Failed to update opted-out status' },
      { status: 500 },
    );
  }
}


