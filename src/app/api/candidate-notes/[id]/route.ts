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

export async function GET(_request: Request, { params }: RouteParams) {
  const { id: candidateId } = params;

  try {
    const [note] = await sql`
      SELECT
        "candidateId",
        "content",
        "updatedAt"
      FROM "CandidateNote"
      WHERE "candidateId" = ${candidateId}
      LIMIT 1
    `;

    return NextResponse.json({
      candidateId,
      content: note?.content ?? '',
      updatedAt: note?.updatedAt ?? null,
    });
  } catch (error) {
    console.error('Error fetching candidate note', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidate note' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id: candidateId } = params;

  try {
    const body = await request.json();
    const { content } = body ?? {};

    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'content must be a string' },
        { status: 400 },
      );
    }

    const [note] = await sql`
      INSERT INTO "CandidateNote" (
        "candidateId",
        "content",
        "updatedAt"
      ) VALUES (
        ${candidateId},
        ${content},
        NOW()
      )
      ON CONFLICT ("candidateId") DO UPDATE SET
        "content" = EXCLUDED."content",
        "updatedAt" = NOW()
      RETURNING
        "candidateId",
        "content",
        "updatedAt"
    `;

    return NextResponse.json(note);
  } catch (error) {
    console.error('Error upserting candidate note', error);
    return NextResponse.json(
      { error: 'Failed to upsert candidate note' },
      { status: 500 },
    );
  }
}

