import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id: candidateId } = params;

  try {
    const items = await prisma.journeyItem.findMany({
      where: { candidateId },
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching journey items', error);
    return NextResponse.json(
      { error: 'Failed to fetch journey items' },
      { status: 500 },
    );
  }
}

export type JourneyItemPayload = {
  instanceId?: string;
  actionId?: string | null;
  stageId?: string | null;
  shortTitle?: string;
  title?: string | null;
  status?: string;
  date?: string | null;
  comment?: string | null;
  poc?: string | null;
  duration?: string | null;
  isCustom?: boolean;
  orderIndex?: number;
};

export async function PUT(request: Request, { params }: RouteParams) {
  const { id: candidateId } = params;

  try {
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Expected an array of journey items' },
        { status: 400 },
      );
    }

    const upserts = body.map((item: JourneyItemPayload, index: number) => {
      if (!item.instanceId) {
        return prisma.journeyItem.create({
          data: {
            candidateId,
            instanceId: `api-${candidateId}-${Date.now()}-${index}`,
            actionId: item.actionId != null ? Number(item.actionId) : null,
            stageId: item.stageId ?? null,
            shortTitle: item.shortTitle,
            title: item.title ?? null,
            status: item.status ?? 'not-done',
            date: item.date ?? null,
            comment: item.comment ?? null,
            poc: item.poc ?? null,
            duration: item.duration ?? null,
            isCustom: item.isCustom ?? false,
            orderIndex: item.orderIndex ?? index,
          },
        });
      }

      return prisma.journeyItem.upsert({
        where: { instanceId: item.instanceId },
        update: {
          candidateId,
          actionId: item.actionId != null ? Number(item.actionId) : null,
          stageId: item.stageId ?? null,
          shortTitle: item.shortTitle,
          title: item.title ?? null,
          status: item.status ?? 'not-done',
          date: item.date ?? null,
          comment: item.comment ?? null,
          poc: item.poc ?? null,
          duration: item.duration ?? null,
          isCustom: item.isCustom ?? false,
          orderIndex: item.orderIndex ?? index,
        },
        create: {
          candidateId,
          instanceId: item.instanceId,
          actionId: item.actionId != null ? Number(item.actionId) : null,
          stageId: item.stageId ?? null,
          shortTitle: item.shortTitle,
          title: item.title ?? null,
          status: item.status ?? 'not-done',
          date: item.date ?? null,
          comment: item.comment ?? null,
          poc: item.poc ?? null,
          duration: item.duration ?? null,
          isCustom: item.isCustom ?? false,
          orderIndex: item.orderIndex ?? index,
        },
      });
    });

    const result = await prisma.$transaction(upserts);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error upserting journey items', error);
    return NextResponse.json(
      { error: 'Failed to upsert journey items' },
      { status: 500 },
    );
  }
}

