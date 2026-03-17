import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && !inQuotes) {
      inQuotes = true;
      continue;
    }

    if (char === '"' && inQuotes) {
      if (next === '"') {
        current += '"';
        i++;
        continue;
      } else {
        inQuotes = false;
        continue;
      }
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
    .map(parseCsvLine);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No CSV file received." },
        { status: 400 }
      );
    }

    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length < 4) {
      return NextResponse.json(
        { error: "CSV does not look like the Mentorque OPS tracker format." },
        { status: 400 }
      );
    }

    const header = rows[0];
    const namesRow = rows[1];

    const candidateBlocks: {
      candidateIndex: number;
      name: string;
      mentor?: string;
      role?: string;
    }[] = [];

    for (let i = 0; i < header.length; i++) {
      if (header[i] === "Candidate") {
        const name = namesRow[i]?.trim();
        if (!name) continue;
        const role = namesRow[i + 2]?.trim() || undefined;
        const mentor = namesRow[i + 3]?.trim() || undefined;
        candidateBlocks.push({
          candidateIndex: i,
          name,
          role,
          mentor
        });
      }
    }

    if (candidateBlocks.length === 0) {
      return NextResponse.json(
        { error: "Could not detect any candidates in the CSV header." },
        { status: 400 }
      );
    }

    let candidatesImported = 0;
    let actionsImported = 0;

    for (const block of candidateBlocks) {
      const name = block.name;
      const id = slugify(name) || `candidate-${Date.now()}`;

      const candidate = await prisma.candidate.upsert({
        where: {
          id
        },
        update: {
          name,
          role: block.role ?? "TBD",
          mentor: block.mentor ?? "TBD",
        },
        create: {
          id,
          name,
          role: block.role ?? "TBD",
          mentor: block.mentor ?? "TBD",
          currentStageId: "onboarding",
          riskLevel: "normal",
          isAlumni: false,
          enrolledDate: new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          notes: null,
        }
      });

      candidatesImported++;

      const colDate = block.candidateIndex;
      const colWeek = block.candidateIndex + 1;
      const colAction = block.candidateIndex + 2;
      const colComment = block.candidateIndex + 3;

      for (let r = 3; r < rows.length; r++) {
        const row = rows[r];
        const date = row[colDate]?.trim();
        const action = row[colAction]?.trim();
        const comment = row[colComment]?.trim();

        if (!date && !action && !comment) continue;

        const title = action || "Action";
        const descriptionParts: string[] = [];
        if (date) descriptionParts.push(`Date: ${date}`);
        const week = row[colWeek]?.trim();
        if (week) descriptionParts.push(`Week: ${week}`);
        if (comment) descriptionParts.push(`Comment: ${comment}`);

        await prisma.journeyItem.create({
          data: {
            candidateId: candidate.id,
            instanceId: `import-${candidate.id}-${r}`,
            actionId: null,
            stageId: null,
            shortTitle: title,
            title: null,
            status: "done",
            date: date || null,
            comment: descriptionParts.join(" | ") || null,
            poc: null,
            duration: null,
            isCustom: true,
            orderIndex: r - 3,
          },
        });

        actionsImported++;
      }
    }

    return NextResponse.json({
      ok: true,
      candidatesImported,
      actionsImported
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected error while importing." },
      { status: 500 }
    );
  }
}

