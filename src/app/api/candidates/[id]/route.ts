import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        journeyItems: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(candidate);
  } catch (error) {
    console.error('Error fetching candidate', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidate' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = params;

  try {
    const body = await request.json();
    const { mentor, notes, riskLevel, currentStageId } = body ?? {};

    const data: Record<string, unknown> = {};
    if (mentor !== undefined) data.mentor = mentor;
    if (notes !== undefined) data.notes = notes;
    if (riskLevel !== undefined) data.riskLevel = riskLevel;
    if (currentStageId !== undefined) data.currentStageId = currentStageId;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 },
      );
    }

    const updated = await prisma.candidate.update({
      where: { id },
      data,
      include: {
        journeyItems: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('Error updating candidate', error);

    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2025') {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to update candidate' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Delete related records first due to foreign key constraints
    await prisma.journeyItem.deleteMany({
      where: { candidateId: params.id }
    });
    await prisma.candidateAction.deleteMany({
      where: { candidateId: params.id }
    });
    await prisma.calendarEvent.deleteMany({
      where: { candidateId: params.id }
    });
    await prisma.mentorOverride.deleteMany({
      where: { candidateId: params.id }
    });
    await prisma.candidateNote.deleteMany({
      where: { candidateId: params.id }
    });
    // Now delete the candidate
    await prisma.candidate.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete candidate error:', error);
    return NextResponse.json(
      { error: 'Failed to delete candidate' },
      { status: 500 },
    );
  }
}

