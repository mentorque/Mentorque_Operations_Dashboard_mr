import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

interface RouteParams {
  params: {
    id: string;
  };
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const sql = neon(process.env.DATABASE_URL);

interface JourneyItemRow {
  id: string;
  candidateId: string;
  instanceId: string;
  actionId: number | null;
  stageId: string | null;
  shortTitle: string;
  title: string | null;
  status: string;
  date: string | null;
  comment: string | null;
  poc: string | null;
  duration: string | null;
  isCustom: boolean;
  orderIndex: number;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id: candidateId } = params;

  try {
    const items = await sql`
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
      WHERE "candidateId" = ${candidateId}
      ORDER BY "orderIndex" ASC
    `;

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
      const instanceId = item.instanceId
        ? item.instanceId
        : `api-${candidateId}-${Date.now()}-${index}`;

      const actionId = item.actionId != null ? Number(item.actionId) : null;

      const rowId = randomUUID();
      return sql`
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
          ${rowId},
          ${candidateId},
          ${instanceId},
          ${actionId},
          ${item.stageId ?? null},
          ${item.shortTitle ?? ''},
          ${item.title ?? null},
          ${item.status ?? 'not-done'},
          ${item.date ?? null},
          ${item.comment ?? null},
          ${item.poc ?? null},
          ${item.duration ?? null},
          ${item.isCustom ?? false},
          ${item.orderIndex ?? index}
        )
        ON CONFLICT ("instanceId") DO UPDATE SET
          "candidateId" = EXCLUDED."candidateId",
          "actionId" = EXCLUDED."actionId",
          "stageId" = EXCLUDED."stageId",
          "shortTitle" = EXCLUDED."shortTitle",
          "title" = EXCLUDED."title",
          "status" = EXCLUDED."status",
          "date" = EXCLUDED."date",
          "comment" = EXCLUDED."comment",
          "poc" = EXCLUDED."poc",
          "duration" = EXCLUDED."duration",
          "isCustom" = EXCLUDED."isCustom",
          "orderIndex" = EXCLUDED."orderIndex"
        RETURNING
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
      `;
    });

    const transactionResults = (await sql.transaction(upserts)) as JourneyItemRow[][];
    const result = transactionResults
      .map((rows) => rows[0])
      .filter((row): row is JourneyItemRow => row != null);

    // Keep deterministic ordering for the client.
    const sorted = result.slice().sort((a, b) => a.orderIndex - b.orderIndex);

    return NextResponse.json(sorted);
  } catch (error) {
    console.error('Error upserting journey items', error);
    return NextResponse.json(
      { error: 'Failed to upsert journey items' },
      { status: 500 },
    );
  }
}

