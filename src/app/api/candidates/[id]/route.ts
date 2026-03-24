import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import type { Candidate } from '@/lib/data';
import { computePacingAlertFromItems, getPaceBucket } from '@/lib/ops-store';

interface RouteParams {
  params: {
    id: string;
  };
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const sql = neon(process.env.DATABASE_URL);

interface DeletedCandidateRow {
  id: string;
}

function computePaceStatus(candidate: {
  id: string;
  name: string;
  role: string;
  mentor: string;
  currentStageId: string;
  riskLevel: string;
  isAlumni: boolean;
  optedOut?: boolean;
  enrolledDate: string;
  notes?: string | null;
}, journeyItems: Array<{
  actionId?: number | null;
  status: string;
  date?: string | null;
  shortTitle?: string | null;
}>): 'at-risk' | 'watch' | 'on-track' {
  const paceInput: Candidate = {
    id: candidate.id,
    name: candidate.name,
    role: candidate.role,
    mentor: candidate.mentor,
    currentStageId: candidate.currentStageId as Candidate['currentStageId'],
    riskLevel: candidate.riskLevel as Candidate['riskLevel'],
    isAlumni: candidate.isAlumni,
    optedOut: candidate.optedOut,
    enrolledDate: candidate.enrolledDate,
    actions: [],
    notes: candidate.notes ?? undefined,
  };
  const paceItems = journeyItems.map((item) => ({
    actionId: item.actionId ?? undefined,
    status: item.status,
    date: item.date ?? undefined,
    shortTitle: item.shortTitle ?? undefined,
  }));
  return getPaceBucket(computePacingAlertFromItems(paceInput, paceItems));
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = params;

  try {
    const [candidate] = await sql`
      SELECT
        "id",
        "name",
        "role",
        "mentor",
        "currentStageId",
        "riskLevel",
        "isAlumni",
        "optedOut",
        "enrolledDate",
        "notes",
        "createdAt",
        "updatedAt"
      FROM "Candidate"
      WHERE "id" = ${id}
      LIMIT 1
    `;

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    const journeyItems = await sql`
      SELECT
        "id",
        "candidateId",
        "instanceId",
        "actionId",
        "stageId",
        "shortTitle",
        "title",
        "status",
        "date",
        "comment",
        "poc",
        "duration",
        "isCustom",
        "orderIndex"
      FROM "JourneyItem"
      WHERE "candidateId" = ${id}
      ORDER BY "orderIndex" ASC
    `;

    const paceStatus = computePaceStatus(candidate, journeyItems);
    return NextResponse.json({ ...candidate, paceStatus, journeyItems });
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

    const hasMentor = mentor !== undefined;
    const hasNotes = notes !== undefined;
    const hasRiskLevel = riskLevel !== undefined;
    const hasCurrentStageId = currentStageId !== undefined;

    const [updated] = await sql`
      UPDATE "Candidate"
      SET
        "mentor" = CASE WHEN ${hasMentor} THEN ${mentor} ELSE "mentor" END,
        "notes" = CASE WHEN ${hasNotes} THEN ${notes} ELSE "notes" END,
        "riskLevel" = CASE WHEN ${hasRiskLevel} THEN ${riskLevel} ELSE "riskLevel" END,
        "currentStageId" = CASE WHEN ${hasCurrentStageId} THEN ${currentStageId} ELSE "currentStageId" END,
        "updatedAt" = NOW()
      WHERE "id" = ${id}
      RETURNING
        "id",
        "name",
        "role",
        "mentor",
        "currentStageId",
        "riskLevel",
        "isAlumni",
        "optedOut",
        "enrolledDate",
        "notes",
        "createdAt",
        "updatedAt"
    `;

    if (!updated) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    const journeyItems = await sql`
      SELECT
        "id",
        "candidateId",
        "instanceId",
        "actionId",
        "stageId",
        "shortTitle",
        "title",
        "status",
        "date",
        "comment",
        "poc",
        "duration",
        "isCustom",
        "orderIndex"
      FROM "JourneyItem"
      WHERE "candidateId" = ${id}
      ORDER BY "orderIndex" ASC
    `;

    const paceStatus = computePaceStatus(updated, journeyItems);
    return NextResponse.json({ ...updated, paceStatus, journeyItems });
  } catch (error: unknown) {
    console.error('Error updating candidate', error);

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
    const results = await sql.transaction([
      sql`DELETE FROM "JourneyItem" WHERE "candidateId" = ${params.id}`,
      sql`DELETE FROM "CandidateAction" WHERE "candidateId" = ${params.id}`,
      sql`DELETE FROM "CalendarEvent" WHERE "candidateId" = ${params.id}`,
      sql`DELETE FROM "MentorOverride" WHERE "candidateId" = ${params.id}`,
      sql`DELETE FROM "CandidateNote" WHERE "candidateId" = ${params.id}`,
      sql`DELETE FROM "Candidate" WHERE "id" = ${params.id} RETURNING "id"`,
    ]);

    const deletedCandidateRows = results?.[results.length - 1] as DeletedCandidateRow[] | undefined;
    const deletedCandidate = Array.isArray(deletedCandidateRows) ? deletedCandidateRows[0] : undefined;
    if (!deletedCandidate) {
      throw new Error('Candidate not found');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete candidate error:', error);
    return NextResponse.json(
      { error: 'Failed to delete candidate' },
      { status: 500 },
    );
  }
}

