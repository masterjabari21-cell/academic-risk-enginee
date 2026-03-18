import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

// pdf-parse is CommonJS — kept out of the bundle via serverExternalPackages
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (
  buffer: Buffer
) => Promise<{ text: string; numpages: number }>;

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
  // 0. Validate API key before anything else
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured. Add your key to .env.local and restart the server." },
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

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "No file provided. Send the PDF under the field name 'file'." },
      { status: 400 }
    );
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are accepted." },
      { status: 415 }
    );
  }

  // 2. Extract text from the PDF
  const buffer = Buffer.from(await file.arrayBuffer());
  let extractedText: string;
  try {
    const result = await pdfParse(buffer);
    extractedText = result.text;
  } catch {
    return NextResponse.json(
      { error: "Failed to parse PDF. The file may be corrupt or encrypted." },
      { status: 422 }
    );
  }

  if (!extractedText.trim()) {
    return NextResponse.json(
      { error: "No text could be extracted from this PDF." },
      { status: 422 }
    );
  }

  // 3. Send to Claude for structured extraction
  let rawJson: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the syllabus text:\n\n${extractedText}`,
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

  // 4. Parse JSON — strip code fences if Claude wrapped it
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
