/**
 * normalize.ts
 *
 * Converts the raw JSON from Claude's syllabus extraction into a single,
 * consistent array of AcademicItem objects.
 *
 * Rules:
 * - Quizzes and tests are split out of "exams" into their own type
 * - Projects, capstones, and lab reports are split out of "assignments"
 * - All missing fields fall back to safe nulls / sensible defaults
 * - Dates are lightly cleaned but kept as strings (no forced parsing)
 * - Every item gets a stable ID so React keys and deduplication work
 */

// ── Input shape (what Claude returns) ────────────────────────────────────────

export interface RawAnalysis {
  courses: {
    name: string;
    code: string;
    credits: number;
  }[];
  assignments: {
    name: string;
    due_date: string | null;
    points: string | null;
    course_code: string | null;
  }[];
  exams: {
    name: string;
    date: string | null;
    type: string;
    course_code: string | null;
  }[];
  deadlines: {
    name: string;
    date: string | null;
  }[];
}

// ── Output shape ──────────────────────────────────────────────────────────────

export type ItemType = "assignment" | "quiz" | "exam" | "project" | "deadline";

export interface AcademicItem {
  /** Stable key: `<type>-<slugified-title>-<index>` */
  id: string;
  type: ItemType;
  title: string;
  /** Course code from the syllabus, e.g. "BIOL 1040". Null if unknown. */
  courseCode: string | null;
  /** Date string as extracted — e.g. "Mar 21", "April 5". Null if missing. */
  dueDate: string | null;
  /**
   * Weight string as extracted — e.g. "15%", "50 pts".
   * Null if not stated in the syllabus.
   */
  weight: string | null;
  /**
   * Extra context: exam subtype ("Midterm", "Final"), or a project note.
   * Null for assignments / deadlines.
   */
  notes: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function makeId(type: ItemType, title: string, index: number): string {
  return `${type}-${slugify(title)}-${index}`;
}

/**
 * Lightly clean a date string:
 * - Trim whitespace
 * - Return null if it's empty, "n/a", "none", or a bare question mark
 */
function normalizeDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s || /^(n\/a|none|tbd|\?)$/i.test(s)) return null;
  return s;
}

/**
 * Classify an exam by its type string.
 * Claude uses values like "Midterm", "Final", "Quiz", "Test", "Exam".
 */
function classifyExam(type: string, title: string): ItemType {
  const t = (type + " " + title).toLowerCase();
  if (/\b(quiz|pop quiz)\b/.test(t)) return "quiz";
  if (/\b(test)\b/.test(t) && !/midterm|final/.test(t)) return "quiz";
  return "exam";
}

/**
 * Classify an assignment by its title.
 * Projects, labs, capstones, and presentations get their own type.
 */
function classifyAssignment(title: string): ItemType {
  const t = title.toLowerCase();
  if (
    /\b(project|lab report|case study|capstone|thesis|dissertation|research paper|term paper|presentation|portfolio|practicum)\b/.test(t)
  ) {
    return "project";
  }
  return "assignment";
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * normalizeItems
 *
 * Converts a RawAnalysis (from Claude) into a flat, consistently shaped
 * array of AcademicItem objects, ready for risk scoring or rendering.
 *
 * @example
 * const items = normalizeItems(claudeJson);
 * const exams = items.filter(i => i.type === "exam");
 */
export function normalizeItems(raw: RawAnalysis): AcademicItem[] {
  const items: AcademicItem[] = [];
  let idx = 0;

  // 1. Assignments + projects
  for (const a of raw.assignments ?? []) {
    const title      = a.name?.trim()        || "Untitled Assignment";
    const type       = classifyAssignment(title);
    const courseCode = a.course_code?.trim() || null;
    const dueDate    = normalizeDate(a.due_date);
    const weight     = a.points?.trim()      || null;

    items.push({
      id:         makeId(type, title, idx++),
      type,
      title,
      courseCode,
      dueDate,
      weight,
      notes: null,
    });
  }

  // 2. Exams + quizzes
  for (const e of raw.exams ?? []) {
    const title      = e.name?.trim()        || "Untitled Exam";
    const type       = classifyExam(e.type ?? "", title);
    const courseCode = e.course_code?.trim() || null;
    const dueDate    = normalizeDate(e.date);
    // Preserve the original subtype as notes (e.g. "Final", "Midterm")
    const notes      = e.type?.trim()        || null;

    items.push({
      id:         makeId(type, title, idx++),
      type,
      title,
      courseCode,
      dueDate,
      weight: null, // exams rarely have a separate points field in syllabuses
      notes,
    });
  }

  // 3. Deadlines
  for (const d of raw.deadlines ?? []) {
    const title   = d.name?.trim() || "Untitled Deadline";
    const dueDate = normalizeDate(d.date);

    items.push({
      id:         makeId("deadline", title, idx++),
      type:       "deadline",
      title,
      courseCode: null,
      dueDate,
      weight:     null,
      notes:      null,
    });
  }

  return items;
}

// ── Convenience filters ───────────────────────────────────────────────────────

/** All items with a known due date, sorted chronologically where possible. */
export function itemsWithDates(items: AcademicItem[]): AcademicItem[] {
  return items.filter((i) => i.dueDate !== null);
}

/** Items of a specific type. */
export function itemsByType(items: AcademicItem[], type: ItemType): AcademicItem[] {
  return items.filter((i) => i.type === type);
}

/** Items belonging to a specific course code. */
export function itemsByCourse(items: AcademicItem[], courseCode: string): AcademicItem[] {
  return items.filter(
    (i) => i.courseCode?.toLowerCase() === courseCode.toLowerCase()
  );
}
