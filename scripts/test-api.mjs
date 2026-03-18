/**
 * Quick smoke test for /api/analyze-syllabus
 *
 * Usage:
 *   1. Start dev server:  npm run dev
 *   2. Run this script:   node scripts/test-api.mjs [path/to/syllabus.pdf]
 *
 * If no PDF path is given, a built-in sample syllabus is used.
 */

import fs from "fs";
import path from "path";

const BASE_URL = process.env.API_URL ?? "http://localhost:3000";
const pdfArg   = process.argv[2];

// ── Minimal valid PDF with syllabus-like text ────────────────────────────────
// Raw PDF built inline so the script works without any real file.
function makeSamplePdf() {
  const content = [
    "CS 101: Introduction to Computer Science",
    "Spring 2025 Syllabus",
    "",
    "Assignments:",
    "  - Homework 1: Variables and Loops    Due: January 24",
    "  - Homework 2: Functions              Due: February 7",
    "  - Homework 3: Recursion              Due: February 28",
    "  - Final Project                      Due: April 25",
    "",
    "Exams:",
    "  - Midterm Exam                       Date: March 5",
    "  - Final Exam                         Date: May 2",
    "",
    "Important Deadlines:",
    "  - Last day to add/drop               January 17",
    "  - Spring Break (no class)            March 17 - 21",
    "  - Last day to withdraw               April 4",
  ].join("\n");

  // Build a minimal valid PDF that pdf-parse can extract text from
  const stream = `BT\n/F1 12 Tf\n50 750 Td\n${
    content.split("\n").map((line, i) =>
      i === 0
        ? `(${line.replace(/[()\\]/g, "\\$&")}) Tj`
        : `0 -16 Td (${line.replace(/[()\\]/g, "\\$&")}) Tj`
    ).join("\n")
  }\nET`;

  const obj1 = `1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n`;
  const obj2 = `2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n`;
  const obj3 = `3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]\n  /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>>\nendobj\n`;
  const obj4 = `4 0 obj\n<</Length ${stream.length}>>\nstream\n${stream}\nendstream\nendobj\n`;
  const obj5 = `5 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>\nendobj\n`;

  const header = `%PDF-1.4\n`;
  let body = header + obj1 + obj2 + obj3 + obj4 + obj5;

  // xref
  const offsets = [];
  let pos = header.length;
  for (const obj of [obj1, obj2, obj3, obj4, obj5]) {
    offsets.push(pos);
    pos += obj.length;
  }

  const xref = [
    `xref\n0 6\n`,
    `0000000000 65535 f \n`,
    ...offsets.map(o => `${String(o).padStart(10, "0")} 00000 n \n`),
  ].join("");

  const trailer = `trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n${pos}\n%%EOF\n`;
  return Buffer.from(body + xref + trailer);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  let pdfBuffer;
  let label;

  if (pdfArg) {
    const resolved = path.resolve(pdfArg);
    if (!fs.existsSync(resolved)) {
      console.error(`File not found: ${resolved}`);
      process.exit(1);
    }
    pdfBuffer = fs.readFileSync(resolved);
    label = path.basename(resolved);
  } else {
    pdfBuffer = makeSamplePdf();
    label = "built-in sample syllabus";
  }

  console.log(`\n🧪 Testing POST ${BASE_URL}/api/analyze-syllabus`);
  console.log(`   PDF: ${label} (${(pdfBuffer.length / 1024).toFixed(1)} KB)\n`);

  // Check ANTHROPIC_API_KEY is likely set (server-side env, just remind user)
  console.log("⏳ Sending request — this calls Claude, may take 10–20s...\n");

  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  const form = new FormData();
  form.append("file", blob, "test.pdf");

  let res;
  try {
    res = await fetch(`${BASE_URL}/api/analyze-syllabus`, {
      method: "POST",
      body: form,
    });
  } catch {
    console.error("❌  Could not reach the server. Is `npm run dev` running?");
    process.exit(1);
  }

  const data = await res.json();

  if (!res.ok) {
    console.error(`❌  ${res.status} error from server:`);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(`✅  ${res.status} OK\n`);
  console.log(`📋  Assignments (${data.assignments?.length ?? 0}):`);
  (data.assignments ?? []).forEach(a =>
    console.log(`     • ${a.name}${a.due_date ? ` — ${a.due_date}` : ""}`)
  );

  console.log(`\n📝  Exams (${data.exams?.length ?? 0}):`);
  (data.exams ?? []).forEach(e =>
    console.log(`     • ${e.name}${e.date ? ` — ${e.date}` : ""} [${e.type}]`)
  );

  console.log(`\n🗓   Deadlines (${data.deadlines?.length ?? 0}):`);
  (data.deadlines ?? []).forEach(d =>
    console.log(`     • ${d.name}${d.date ? ` — ${d.date}` : ""}`)
  );

  console.log("\nFull JSON:\n");
  console.log(JSON.stringify(data, null, 2));
}

main();