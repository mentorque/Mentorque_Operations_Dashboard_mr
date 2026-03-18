import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { JOURNEY_ACTIONS } from '@/lib/data';

export async function GET() {
  try {
    const candidates = await prisma.candidate.findMany({
      include: {
        journeyItems: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(candidates);
  } catch (error) {
    console.error('Error fetching candidates', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidates' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      id,
      name,
      role,
      mentor,
      currentStageId,
      riskLevel = 'normal',
      isAlumni = false,
      enrolledDate,
      notes,
    } = body ?? {};

    if (!name || !role || !mentor || !currentStageId || !enrolledDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const journeyItemsData = JOURNEY_ACTIONS.map((action, index) => ({
      instanceId: `seed-${id ?? name}-${action.id}`,
      actionId: action.id,
      stageId: action.stageId,
      shortTitle: action.shortTitle,
      title: action.title ?? null,
      status: 'not-done',
      date: null,
      comment: null,
      poc: action.poc ?? null,
      duration: action.duration ?? null,
      isCustom: false,
      orderIndex: index,
    }));

    const candidate = await prisma.$transaction(async (tx) => {
      const created = await tx.candidate.create({
        data: {
          id,
          name,
          role,
          mentor,
          currentStageId,
          riskLevel,
          isAlumni,
          enrolledDate,
          notes: notes ?? null,
          journeyItems: {
            create: journeyItemsData,
          },
        },
        include: {
          journeyItems: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      return created;
    });

    return NextResponse.json(candidate, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating candidate', error);

    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Candidate with this id already exists' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to create candidate' },
      { status: 500 },
    );
  }
}

