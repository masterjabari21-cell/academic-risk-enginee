import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an academic assistant that extracts structured data from college course syllabuses.

Extract every assignment, exam, project, and important deadline mentioned in the syllabus.
Be thorough — include all dates you can find.

Return ONLY valid JSON in exactly this shape (no markdown, no explanation):
{
  "assignments": [
    { "name": "string", "due_date": "string or null", "points": "string or null" }
  ],
  "exams": [
    { "name": "string", "date": "string or null", "type": "string (Midterm, Final, Quiz, etc.)" }
  ],
  "deadlines": [
    { "name": "string", "date": "string or null" }
  ]
}

Rules:
- Use the exact date text from the syllabus (e.g. "September 15", "Week 4", "Oct 3")
- If a date is not mentioned, use null
- Include projects under "assignments"
- Include quizzes under "exams"
- "deadlines" is for anything that doesn't fit the other two (add/drop, withdrawal, reading days, etc.)
- If a field has no items, return an empty array — never omit a key`;

export async function POST(req: NextRequest) {
  // 0. Validate API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 503 }
    );
  }
  const anthropic = new Anthropic({ apiKey });

  // 1. Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid request — expected multipart/form-data" },
      { status: 400 }
    );
  }

  const rawFiles = formData.getAll("file");
  if (!rawFiles.length) {
    return NextResponse.json(
      { error: "No file provided. Send the PDF under the field name 'file'." },
      { status: 400 }
    );
  }
  const blobs = rawFiles.filter((f) => f instanceof File && f.type === "application/pdf") as File[];
  if (!blobs.length) {
    return NextResponse.json(
      { error: "Only PDF files are accepted." },
      { status: 415 }
    );
  }

  // 2. Convert all PDFs to base64 and send directly to Claude
  const docBlocks = await Promise.all(
    blobs.map(async (blob) => {
      const buf = Buffer.from(await blob.arrayBuffer());
      return {
        type: "document" as const,
        source: { type: "base64" as const, media_type: "application/pdf" as const, data: buf.toString("base64") },
      };
    })
  );

  let rawJson: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            ...docBlocks,
            {
              type: "text",
              text: blobs.length > 1
                ? "Extract all assignments, exams, and deadlines from all of these syllabuses combined."
                : "Extract all assignments, exams, and deadlines from this syllabus.",
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    if (!textBlock) {
      throw new Error("No text in Claude response");
    }
    rawJson = textBlock.text.trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Claude API error: ${msg}` },
      { status: 502 }
    );
  }

  // 3. Parse JSON — strip code fences if Claude wrapped it
  type Parsed = {
    assignments: { name: string; due_date: string | null; points: string | null }[];
    exams:       { name: string; date: string | null; type: string }[];
    deadlines:   { name: string; date: string | null }[];
  };

  let parsed: Parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    const match = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/);
    try {
      parsed = JSON.parse(match?.[1] ?? rawJson);
    } catch {
      return NextResponse.json(
        { error: "Claude returned malformed JSON.", raw: rawJson },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    assignments: parsed.assignments ?? [],
    exams:       parsed.exams       ?? [],
    deadlines:   parsed.deadlines   ?? [],
  });
}
