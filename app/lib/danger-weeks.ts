/**
 * danger-weeks.ts
 *
 * Identifies which weeks in a semester are high-risk based on workload
 * density, item type composition, and deadline clustering.
 *
 * Reasons are written in plain English so students immediately understand
 * WHY a week is flagged — not "score threshold exceeded" but
 * "3 deadlines and 1 quiz are clustered within 4 days".
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ItemKind = "assignment" | "quiz" | "exam" | "project" | "deadline";
export type LoadLevel = "Critical" | "High" | "Medium";

export interface WorkloadItem {
  title: string;
  kind: ItemKind;
  /** Raw date string — e.g. "Mar 21", "April 5". Null means undated. */
  date: string | null;
  /** Weight string — e.g. "15%", "50 pts". Null if unstated. */
  weight?: string | null;
}

export interface DangerWeek {
  /** Mon–Fri label — e.g. "Mar 21 – Mar 25" */
  week: string;
  load: LoadLevel;
  summary: string;
  /** Human-readable sentences explaining exactly why this week is flagged. */
  reasons: string[];
  /** Concrete, actionable suggestions. Ready to show in the UI. */
  actions: string[];
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseDate(str: string | null | undefined): Date | null {
  if (!str || /^(tbd|n\/a|none|\?)$/i.test(str.trim())) return null;
  const m = str.trim().match(/^([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/);
  if (m) {
    const year = m[3] ? parseInt(m[3]) : 2026;
    const d = new Date(`${m[1]} ${m[2]}, ${year}`);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function toWeekKey(date: Date): string {
  const day = date.getDay();
  const mon = new Date(date);
  mon.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(mon)} – ${fmt(fri)}`;
}

function dayOfWeek(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

// ── Reason builders ───────────────────────────────────────────────────────────

/** How many calendar days do the dated items span within the week? */
function clusterSpan(dates: Date[]): number {
  if (dates.length < 2) return 0;
  const ms = dates.map((d) => d.getTime()).sort((a, b) => a - b);
  return Math.round((ms[ms.length - 1] - ms[0]) / 86400000);
}

function pluralize(n: number, word: string): string {
  return `${n} ${word}${n !== 1 ? "s" : ""}`;
}

function weightPct(weight: string | null | undefined): number {
  if (!weight) return 0;
  return parseFloat(weight.replace(/[^0-9.]/g, "")) || 0;
}

function buildReasons(
  items: (WorkloadItem & { parsedDate: Date })[],
): string[] {
  const reasons: string[] = [];

  // Count by kind
  const counts: Record<ItemKind, number> = {
    assignment: 0, quiz: 0, exam: 0, project: 0, deadline: 0,
  };
  for (const i of items) counts[i.kind]++;

  // Identify high-stakes exams
  const finals   = items.filter((i) => i.kind === "exam" && /final|comprehensive/i.test(i.title));
  const midterms = items.filter((i) => i.kind === "exam" && /midterm/i.test(i.title));
  const heavyItems = items.filter((i) => weightPct(i.weight) >= 15);

  // Finals get called out by name
  for (const f of finals) {
    reasons.push(
      `Final exam "${f.title}" is due ${dayOfWeek(f.parsedDate)} — your highest-stakes item`
    );
  }
  for (const m of midterms) {
    reasons.push(`Midterm "${m.title}" falls ${dayOfWeek(m.parsedDate)}`);
  }

  // High-weight non-exam items
  for (const h of heavyItems.filter((i) => i.kind !== "exam")) {
    const pct = weightPct(h.weight);
    reasons.push(
      `"${h.title}" is worth ${pct}% of your grade — not one to rush`
    );
  }

  // Clustering sentence — the most important readability improvement
  const span = clusterSpan(items.map((i) => i.parsedDate));
  const total = items.length;

  if (total >= 2 && span <= 3) {
    // Build a natural list of what's piling up
    const parts: string[] = [];
    if (counts.exam > 0)       parts.push(pluralize(counts.exam, "exam"));
    if (counts.quiz > 0)       parts.push(pluralize(counts.quiz, "quiz"));
    if (counts.project > 0)    parts.push(pluralize(counts.project, "project"));
    if (counts.assignment > 0) parts.push(pluralize(counts.assignment, "assignment"));
    if (counts.deadline > 0)   parts.push(pluralize(counts.deadline, "deadline"));

    const listStr = parts.length === 1
      ? parts[0]
      : parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];

    const spanStr = span === 0 ? "the same day" : `${span} day${span > 1 ? "s" : ""}`;
    reasons.push(`${listStr} ${total === 1 ? "is" : "are"} clustered within ${spanStr}`);
  } else if (total >= 2) {
    // Spread across the week — still note the density
    const parts: string[] = [];
    if (counts.exam + counts.quiz > 0) parts.push(pluralize(counts.exam + counts.quiz, "exam/quiz"));
    if (counts.project > 0)            parts.push(pluralize(counts.project, "project"));
    if (counts.assignment > 0)         parts.push(pluralize(counts.assignment, "assignment"));
    if (counts.deadline > 0)           parts.push(pluralize(counts.deadline, "deadline"));
    const listStr = parts.join(", ");
    reasons.push(`${listStr} spread across the week — heavy but not clustered`);
  }

  // Back-to-back same day
  const byDay = new Map<string, string[]>();
  for (const i of items) {
    const key = i.parsedDate.toDateString();
    byDay.set(key, [...(byDay.get(key) ?? []), i.title]);
  }
  for (const [, titles] of byDay) {
    if (titles.length >= 2) {
      const day = dayOfWeek(new Date(titles[0]));
      reasons.push(
        `${titles.length} items due on the same day (${day}) — plan to finish at least one the night before`
      );
      break; // one same-day warning is enough
    }
  }

  return reasons;
}

function buildSummary(
  items: (WorkloadItem & { parsedDate: Date })[],
  load: LoadLevel,
): string {
  const total   = items.length;
  const exams   = items.filter((i) => i.kind === "exam").length;
  const projs   = items.filter((i) => i.kind === "project").length;
  const assigns = items.filter((i) => i.kind === "assignment" || i.kind === "deadline").length;
  const quizzes = items.filter((i) => i.kind === "quiz").length;
  const hasFinal   = items.some((i) => i.kind === "exam" && /final/i.test(i.title));
  const hasMidterm = items.some((i) => i.kind === "exam" && /midterm/i.test(i.title));
  const span = clusterSpan(items.map((i) => i.parsedDate));

  const parts: string[] = [];
  if (exams   > 0) parts.push(pluralize(exams,   "exam"));
  if (projs   > 0) parts.push(pluralize(projs,   "project"));
  if (assigns > 0) parts.push(pluralize(assigns, "assignment"));
  if (quizzes > 0) parts.push(pluralize(quizzes, "quiz"));

  const itemList  = parts.length === 1
    ? parts[0]
    : parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
  const spanPhrase = span <= 1 ? "back to back" : span <= 3 ? `within ${span} days` : "spread across the week";

  if (hasFinal) {
    return `Finals crunch — ${total} item${total !== 1 ? "s" : ""} ${spanPhrase}, anchored by a cumulative final exam.`;
  }
  if (load === "Critical" && hasMidterm) {
    return `${itemList} ${spanPhrase} — midterm pressure compounds everything else this week.`;
  }
  if (load === "Critical") {
    return `Your most dangerous week — ${itemList} ${spanPhrase} with no room for error.`;
  }
  if (load === "High") {
    return `Heavy week ahead — ${itemList} ${spanPhrase}. Front-load your work or it will compound.`;
  }
  return `Moderate load — ${itemList} ${spanPhrase}. Manageable with a little early prep.`;
}

function buildActions(
  items: (WorkloadItem & { parsedDate: Date })[],
  load: LoadLevel,
): string[] {
  const actions: string[] = [];
  const kinds = new Set(items.map((i) => i.kind));

  const hasFinal   = items.some((i) => i.kind === "exam" && /final/i.test(i.title));
  const hasMidterm = items.some((i) => i.kind === "exam" && /midterm/i.test(i.title));
  const hasProject = kinds.has("project");
  const hasQuiz    = kinds.has("quiz");
  const hasAssign  = kinds.has("assignment");

  if (hasFinal) {
    actions.push("Start a full review session at least 7 days before — don't cram finals");
    actions.push("Visit office hours or form a study group this week");
  } else if (hasMidterm) {
    actions.push("Block 2–3 focused study sessions before the midterm");
    actions.push("Review your notes from the first half of the semester now");
  }

  if (hasProject) {
    actions.push("Draft an outline or first deliverable before this week starts");
  }

  if (hasAssign && (hasFinal || hasMidterm)) {
    actions.push("Knock out assignments a few days early so exam prep gets full focus");
  }

  if (hasQuiz) {
    actions.push("Spend 20–30 minutes reviewing before each quiz — consistency beats cramming");
  }

  if (load === "Critical" && actions.length < 2) {
    actions.push("This is your busiest stretch — guard your schedule and cut non-essentials");
  }

  return actions;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * identifyDangerWeeks
 *
 * Groups workload items by calendar week and returns the top 3 busiest
 * weeks with human-readable reasons and action suggestions.
 *
 * @example
 * const weeks = identifyDangerWeeks([
 *   { title: "Midterm II",      kind: "exam",       date: "Mar 26" },
 *   { title: "Lab Report",      kind: "assignment",  date: "Mar 26", weight: "10%" },
 *   { title: "Problem Set 9",   kind: "assignment",  date: "Mar 29" },
 * ]);
 * // → [{ week: "Mar 24 – Mar 28", load: "Critical", reasons: [...], actions: [...] }]
 */
export function identifyDangerWeeks(items: WorkloadItem[]): DangerWeek[] {
  // Group dated items by Mon–Fri week key
  const weekMap = new Map<string, (WorkloadItem & { parsedDate: Date })[]>();

  for (const item of items) {
    const d = parseDate(item.date);
    if (!d) continue; // skip undated items — can't place them in a week
    const key = toWeekKey(d);
    const existing = weekMap.get(key) ?? [];
    weekMap.set(key, [...existing, { ...item, parsedDate: d }]);
  }

  // Score each week (weighted by item type)
  const TYPE_WEIGHT: Record<ItemKind, number> = {
    exam:       4,
    project:    3,
    assignment: 2,
    quiz:       1.5,
    deadline:   0.5,
  };

  const scored = [...weekMap.entries()].map(([week, weekItems]) => {
    const score = weekItems.reduce((s, i) => s + TYPE_WEIGHT[i.kind], 0);
    return { week, weekItems, score };
  });

  // Take the top 3 by weighted score
  const top3 = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return top3.map(({ week, weekItems, score }) => {
    const load: LoadLevel =
      score >= 10 ? "Critical" :
      score >= 5  ? "High"     :
                    "Medium";

    return {
      week,
      load,
      summary: buildSummary(weekItems, load),
      reasons: buildReasons(weekItems),
      actions: buildActions(weekItems, load),
    };
  });
}
