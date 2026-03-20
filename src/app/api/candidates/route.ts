import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'crypto';
import { JOURNEY_ACTIONS } from '@/lib/data';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const sql = neon(process.env.DATABASE_URL);

function groupCandidatesWithJourneyItems(rows: Array<Record<string, any>>) {
  const map = new Map<string, any>();

  for (const row of rows) {
    let candidate = map.get(row.id);
    if (!candidate) {
      candidate = {
        id: row.id,
        name: row.name,
        role: row.role,
        mentor: row.mentor,
        currentStageId: row.currentStageId,
        riskLevel: row.riskLevel,
        isAlumni: row.isAlumni,
        optedOut: row.optedOut,
        enrolledDate: row.enrolledDate,
        notes: row.notes,
        journeyItems: [],
      };
      map.set(row.id, candidate);
    }

    if (row.journeyItemId) {
      candidate.journeyItems.push({
        id: row.journeyItemId,
        candidateId: row.journeyCandidateId,
        instanceId: row.journeyInstanceId,
        actionId: row.journeyActionId,
        stageId: row.journeyStageId,
        shortTitle: row.journeyShortTitle,
        title: row.journeyTitle,
        status: row.journeyStatus,
        date: row.journeyDate,
        comment: row.journeyComment,
        poc: row.journeyPoc,
        duration: row.journeyDuration,
        isCustom: row.journeyIsCustom,
        orderIndex: row.journeyOrderIndex,
      });
    }
  }

  return [...map.values()];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const optedOut = searchParams.get('optedOut') === 'true';

    const rows = await sql`
      SELECT
        c.id,
        c.name,
        c.role,
        c.mentor,
        c."currentStageId" AS "currentStageId",
        c."riskLevel" AS "riskLevel",
        c."isAlumni" AS "isAlumni",
        c."optedOut" AS "optedOut",
        c."enrolledDate" AS "enrolledDate",
        c.notes AS "notes",
        ji.id AS "journeyItemId",
        ji."candidateId" AS "journeyCandidateId",
        ji."instanceId" AS "journeyInstanceId",
        ji."actionId" AS "journeyActionId",
        ji."stageId" AS "journeyStageId",
        ji."shortTitle" AS "journeyShortTitle",
        ji.title AS "journeyTitle",
        ji.status AS "journeyStatus",
        ji.date AS "journeyDate",
        ji.comment AS "journeyComment",
        ji.poc AS "journeyPoc",
        ji.duration AS "journeyDuration",
        ji."isCustom" AS "journeyIsCustom",
        ji."orderIndex" AS "journeyOrderIndex"
      FROM "Candidate" c
      LEFT JOIN "JourneyItem" ji
        ON ji."candidateId" = c.id
      WHERE c."optedOut" = ${optedOut}
      ORDER BY c.id ASC, ji."orderIndex" ASC
    `;

    const candidates = groupCandidatesWithJourneyItems(rows);

    return NextResponse.json(candidates, {
      headers: {
        'Cache-Control': 's-maxage=20, stale-while-revalidate=59',
      },
    });
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

    const candidateId = id || randomUUID();

    const journeyItemsData = JOURNEY_ACTIONS.map((action, index) => ({
      id: randomUUID(),
      instanceId: `seed-${candidateId}-${action.id}`,
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

    await sql.transaction([
      sql`
        INSERT INTO "Candidate" (
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
        ) VALUES (
          ${candidateId},
          ${name},
          ${role},
          ${mentor},
          ${currentStageId},
          ${riskLevel},
          ${isAlumni},
          false,
          ${enrolledDate},
          ${notes ?? null},
          NOW(),
          NOW()
        );
      `,
      ...journeyItemsData.map(
        (ji) => sql`
          INSERT INTO "JourneyItem" (
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
          ) VALUES (
            ${ji.id},
            ${candidateId},
            ${ji.instanceId},
            ${ji.actionId},
            ${ji.stageId},
            ${ji.shortTitle},
            ${ji.title},
            ${ji.status},
            ${ji.date},
            ${ji.comment},
            ${ji.poc},
            ${ji.duration},
            ${ji.isCustom},
            ${ji.orderIndex}
          );
        `,
      ),
    ]);

    const rows = await sql`
      SELECT
        c.id,
        c.name,
        c.role,
        c.mentor,
        c."currentStageId" AS "currentStageId",
        c."riskLevel" AS "riskLevel",
        c."isAlumni" AS "isAlumni",
        c."optedOut" AS "optedOut",
        c."enrolledDate" AS "enrolledDate",
        c.notes AS "notes",
        ji.id AS "journeyItemId",
        ji."candidateId" AS "journeyCandidateId",
        ji."instanceId" AS "journeyInstanceId",
        ji."actionId" AS "journeyActionId",
        ji."stageId" AS "journeyStageId",
        ji."shortTitle" AS "journeyShortTitle",
        ji.title AS "journeyTitle",
        ji.status AS "journeyStatus",
        ji.date AS "journeyDate",
        ji.comment AS "journeyComment",
        ji.poc AS "journeyPoc",
        ji.duration AS "journeyDuration",
        ji."isCustom" AS "journeyIsCustom",
        ji."orderIndex" AS "journeyOrderIndex"
      FROM "Candidate" c
      LEFT JOIN "JourneyItem" ji
        ON ji."candidateId" = c.id
      WHERE c.id = ${candidateId}
      ORDER BY ji."orderIndex" ASC
    `;

    const [candidate] = groupCandidatesWithJourneyItems(rows);
    return NextResponse.json(candidate, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating candidate', error);

    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === '23505') {
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

