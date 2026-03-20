/**
 * semester-risk.ts
 *
 * Computes an overall semester risk score (0–100) from four components:
 *   1. Average weekly workload  (weighted by item type)
 *   2. Maximum weekly workload  (single worst week)
 *   3. Danger week count        (weeks with heavy load)
 *   4. Exam density             (exams per active week)
 *
 * Also generates 3–5 pattern-based, actionable student recommendations.
 *
 * Formula weights:
 *   avg workload  → 25 pts
 *   max workload  → 30 pts
 *   danger weeks  → 25 pts
 *   exam density  → 20 pts
 *   × credit multiplier (0.8 – 1.35)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ItemKind = "assignment" | "quiz" | "exam" | "project" | "deadline";

export interface RiskItem {
  title: string;
  kind: ItemKind;
  date: string | null;
  weight?: string | null;
}

export interface SemesterRiskResult {
  score: number;          // 0–100
  label: "High" | "Medium" | "Low";
  /** One-sentence summary shown beneath the score ring. */
  explanation: string;
  /** Bullet-point breakdown shown in the risk panel. */
  scoreReasons: string[];
}

export interface Recommendation {
  label: string;
  tag: string;
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

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Item weight for load scoring ──────────────────────────────────────────────

const KIND_WEIGHT: Record<ItemKind, number> = {
  exam:       4,
  project:    3,
  assignment: 2,
  quiz:       1.5,
  deadline:   0.5,
};

function weightPct(weight: string | null | undefined): number {
  if (!weight) return 0;
  return parseFloat(weight.replace(/[^0-9.]/g, "")) || 0;
}

// ── computeSemesterRisk ───────────────────────────────────────────────────────

/**
 * Computes a semester risk score (0–100) from four explicit components.
 *
 * @example
 * const { score, label, explanation, scoreReasons } = computeSemesterRisk(items, 15);
 * // score: 72, label: "High", explanation: "2.4 avg weighted items/week..."
 */
export function computeSemesterRisk(
  items: RiskItem[],
  totalCredits: number,
): SemesterRiskResult {
  const reasons: string[] = [];

  // Group dated items by Mon–Fri week
  const weekLoads  = new Map<string, number>(); // weighted load
  const weekCounts = new Map<string, number>(); // raw item count

  let examCount = 0;
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  for (const item of items) {
    const d = parseDate(item.date);
    if (!d) continue;
    const key  = toWeekKey(d);
    const load = KIND_WEIGHT[item.kind] ?? 1;
    weekLoads.set(key,  (weekLoads.get(key)  ?? 0) + load);
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
    if (item.kind === "exam") examCount++;
    if (!minDate || d < minDate) minDate = d;
    if (!maxDate || d > maxDate) maxDate = d;
  }

  if (weekLoads.size === 0) {
    return {
      score: 10,
      label: "Low",
      explanation: "No dated items found yet — add some to get your risk score.",
      scoreReasons: ["No dated items detected"],
    };
  }

  const allLoads = [...weekLoads.values()];

  // Use full semester span so removing one item doesn't shrink the denominator
  // and artificially inflate averages. Minimum of 10 weeks (a short semester).
  const spanWeeks = minDate && maxDate
    ? Math.ceil((maxDate.getTime() - minDate.getTime()) / (7 * 86_400_000)) + 1
    : weekLoads.size;
  const totalWeeks = Math.max(spanWeeks, weekLoads.size, 10);

  // 1. Average weekly workload
  const avgLoad = allLoads.reduce((s, l) => s + l, 0) / totalWeeks;

  // 2. Maximum weekly workload
  const maxLoad = Math.max(...allLoads);
  const maxWeekKey = [...weekLoads.entries()].find(([, l]) => l === maxLoad)?.[0] ?? "";

  // 3. Danger week count (weighted load ≥ 6 — roughly 1 exam + 1 assignment)
  const dangerCount = allLoads.filter((l) => l >= 6).length;

  // 4. Exam density (exams per active week)
  const examDensity = examCount / totalWeeks;

  // Normalize each component to 0–1, then apply its max pts
  const avgScore    = Math.min(avgLoad    / 6,   1) * 25; // avg 6+ → max 25
  const maxScore    = Math.min(maxLoad    / 10,  1) * 30; // max 10+ → max 30
  const dangerScore = Math.min(dangerCount / 4,  1) * 25; // 4+ weeks → max 25
  const examScore   = Math.min(examDensity / 0.5, 1) * 20; // exam every 2 wks → max 20

  const rawScore = avgScore + maxScore + dangerScore + examScore;

  // Credit multiplier
  const creditMult =
    totalCredits >= 20 ? 1.35 :
    totalCredits >= 18 ? 1.20 :
    totalCredits >= 17 ? 1.10 :
    totalCredits >= 15 ? 1.00 :
    totalCredits >= 12 ? 0.90 :
    totalCredits > 0   ? 0.80 : 1.0;

  const score = Math.min(95, Math.max(5, Math.round(rawScore * creditMult)));
  const label: SemesterRiskResult["label"] =
    score >= 60 ? "High" : score >= 35 ? "Medium" : "Low";

  // Build explanation sentence
  const peakCount  = weekCounts.get(maxWeekKey) ?? 0;
  const creditNote =
    totalCredits >= 18 ? `, amplified by a ${totalCredits}-credit load` :
    totalCredits >= 15 ? `, with a standard ${totalCredits}-credit load` :
    totalCredits > 0   ? `, softened by a lighter ${totalCredits}-credit load` : "";

  const explanation =
    label === "High"
      ? `Your workload spikes hard around ${maxWeekKey} with ${peakCount} items due — ` +
        `${dangerCount > 1 ? `${dangerCount} weeks hit heavy` : "that week hits heavy"}` +
        (examCount > 0 ? ` and ${examCount === 1 ? "an exam" : `${examCount} exams`} add real pressure` : "") +
        `${creditNote}.`
      : label === "Medium"
      ? `Workload is manageable but ${maxWeekKey} is your crunch point with ${peakCount} items` +
        (examCount > 0 ? ` — ${examCount === 1 ? "1 exam" : `${examCount} exams`} keep the stakes real` : "") +
        `${creditNote}.`
      : `Spread out well — ${maxWeekKey} is your busiest stretch at ${peakCount} items` +
        (examCount > 0 ? `, and with only ${examCount === 1 ? "1 exam" : `${examCount} exams`} you have room to breathe` : "") +
        `${creditNote}.`;

  // Build bullet reasons
  reasons.push(`Avg load ${avgLoad.toFixed(1)} items/week across ${totalWeeks} active weeks`);
  reasons.push(`Peak: ${weekCounts.get(maxWeekKey) ?? 0} items due ${maxWeekKey}`);
  if (dangerCount > 0)
    reasons.push(`${dangerCount} high-density week${dangerCount > 1 ? "s" : ""}`);
  if (examCount > 0)
    reasons.push(`${examCount} exam${examCount > 1 ? "s" : ""} · ${(examDensity * 10).toFixed(1)}/10 weeks`);
  if (totalCredits >= 18)
    reasons.push(`${totalCredits} credits — load amplified`);
  else if (totalCredits >= 15)
    reasons.push(`${totalCredits} credits — recommended range`);
  else if (totalCredits > 0)
    reasons.push(`${totalCredits} credits — lighter load`);

  return { score, label, explanation, scoreReasons: reasons };
}

// ── generateRecommendations ───────────────────────────────────────────────────

/**
 * Generates up to 5 specific, pattern-based recommendations.
 *
 * Patterns (in priority order):
 * 1. Imminent high-stakes item due within 7 days → start now
 * 2. Back-to-back exams within 2 days → split study now
 * 3. Assignment sandwiched 1–3 days before an exam → finish early
 * 4. Dense cluster of 3+ items within 5 days → front-load the lightest
 * 5. Cumulative/final exam detected → review sheet now vs active recall sprint
 * 6. High-weight item with no due date → find and lock it in
 * 7. Runway before first danger week → use it on the heaviest upcoming item
 *
 * @param today  Injected for testability; defaults to current date.
 */
export function generateRecommendations(
  items: RiskItem[],
  dangerWeeks: { week: string; load: "Critical" | "High" | "Medium" }[],
  today: Date = new Date(),
): Recommendation[] {
  const recs: Recommendation[] = [];
  const DAY = 86_400_000;

  type Dated = RiskItem & { parsedDate: Date };

  // Split into dated (future only) and undated
  const allDated: Dated[] = items
    .map((i) => ({ ...i, parsedDate: parseDate(i.date)! }))
    .filter((i) => i.parsedDate !== null);

  const undated = items.filter((i) => !parseDate(i.date));

  // Only future items matter for actionable recs
  const future = allDated
    .filter((i) => i.parsedDate >= today)
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

  const exams    = future.filter((i) => i.kind === "exam");
  const projects = future.filter((i) => i.kind === "project");
  const assigns  = future.filter((i) => i.kind === "assignment");

  function daysUntil(d: Date) {
    return Math.ceil((d.getTime() - today.getTime()) / DAY);
  }

  // ── 1. Imminent high-stakes item (due within 7 days) ──────────────────────
  const imminent = future
    .filter((i) => {
      const d = daysUntil(i.parsedDate);
      return d >= 0 && d <= 7 && (
        i.kind === "exam" || i.kind === "project" || weightPct(i.weight) >= 15
      );
    })
    .sort((a, b) => {
      const diff = a.parsedDate.getTime() - b.parsedDate.getTime();
      return diff !== 0 ? diff : KIND_WEIGHT[b.kind] - KIND_WEIGHT[a.kind];
    });

  if (imminent.length > 0) {
    const top  = imminent[0];
    const days = daysUntil(top.parsedDate);
    const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
    recs.push({
      label: `"${top.title}" is due ${when} — make this your only focus until it's done`,
      tag: "Urgent",
    });
  }

  // ── 2. Back-to-back exams (within 2 days of each other) ───────────────────
  for (let i = 0; i < exams.length - 1; i++) {
    const a = exams[i], b = exams[i + 1];
    const gap = (b.parsedDate.getTime() - a.parsedDate.getTime()) / DAY;
    if (gap <= 2) {
      const gapStr = gap <= 1 ? "back-to-back" : "2 days apart";
      recs.push({
        label: `"${a.title}" and "${b.title}" are ${gapStr} — study them as completely separate subjects starting now, not both the night before`,
        tag: "Back-to-back",
      });
      break;
    }
  }

  // ── 3. Assignment/project sandwiched just before an exam ──────────────────
  let sandwichFound = false;
  for (const exam of exams) {
    if (sandwichFound) break;
    const before = [...assigns, ...projects]
      .filter((a) => {
        const diff = (exam.parsedDate.getTime() - a.parsedDate.getTime()) / DAY;
        return diff >= 1 && diff <= 3;
      })
      .sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());

    if (before.length > 0) {
      const item = before[0];
      const days = Math.round((exam.parsedDate.getTime() - item.parsedDate.getTime()) / DAY);
      recs.push({
        label: `"${item.title}" is due ${days} day${days > 1 ? "s" : ""} before your "${exam.title}" — finish it ${days + 2} days early so exam prep gets your full attention`,
        tag: "Finish early",
      });
      sandwichFound = true;
    }
  }

  // ── 4. Dense cluster: 3+ items within 5 days ──────────────────────────────
  let clusterFound = false;
  for (let i = 0; i < future.length && !clusterFound; i++) {
    const anchor  = future[i].parsedDate.getTime();
    const cluster = future.filter((x) => {
      const diff = x.parsedDate.getTime() - anchor;
      return diff >= 0 && diff <= 5 * DAY;
    });
    if (cluster.length >= 3) {
      clusterFound = true;
      const start    = fmtDate(future[i].parsedDate);
      const end      = fmtDate(new Date(Math.max(...cluster.map((x) => x.parsedDate.getTime()))));
      const heaviest = [...cluster].sort((a, b) => KIND_WEIGHT[b.kind] - KIND_WEIGHT[a.kind])[0];
      const lightest = [...cluster].sort((a, b) => KIND_WEIGHT[a.kind] - KIND_WEIGHT[b.kind])[0];
      recs.push({
        label: `${cluster.length} items due ${start}–${end} — clear "${lightest.title}" before the window opens so you have unbroken time for "${heaviest.title}"`,
        tag: "Front-load",
      });
    }
  }

  // ── 5. Finals / cumulative exams ──────────────────────────────────────────
  const finals = exams.filter((e) => /final|comprehensive/i.test(e.title));
  if (finals.length > 0) {
    const next     = finals[0];
    const weeksOut = Math.floor(daysUntil(next.parsedDate) / 7);
    if (weeksOut >= 2) {
      recs.push({
        label: `"${next.title}" is ${weeksOut} week${weeksOut > 1 ? "s" : ""} away — build a one-page review sheet per topic now so nothing is new the night before`,
        tag: "Study plan",
      });
    } else if (weeksOut >= 0) {
      recs.push({
        label: `"${next.title}" is under 2 weeks out — switch to active recall: practice problems and timed mock questions, not rereading notes`,
        tag: "Final sprint",
      });
    }
  } else if (exams.length >= 3 && !recs.find((r) => r.tag === "Study plan")) {
    recs.push({
      label: `${exams.length} exams on the calendar — tie each study session to a specific topic gap, not a vague "review notes" block`,
      tag: "Study plan",
    });
  }

  // ── 6. High-weight item with no due date ──────────────────────────────────
  if (recs.length < 5) {
    const missing = undated
      .filter((i) => weightPct(i.weight) >= 15)
      .sort((a, b) => weightPct(b.weight) - weightPct(a.weight));
    if (missing.length > 0) {
      const top = missing[0];
      recs.push({
        label: `"${top.title}" is worth ${top.weight} but has no due date — find it in the syllabus today and add it to your calendar before it sneaks up`,
        tag: "Missing date",
      });
    }
  }

  // ── 7. Runway before first danger week ────────────────────────────────────
  const criticalWeeks = dangerWeeks.filter((w) => w.load === "Critical" || w.load === "High");
  if (criticalWeeks.length > 0 && recs.length < 4) {
    const upcoming = [...assigns, ...projects].filter((a) => daysUntil(a.parsedDate) > 7);
    if (upcoming.length > 0) {
      const heaviest = upcoming.sort((a, b) => KIND_WEIGHT[b.kind] - KIND_WEIGHT[a.kind])[0];
      recs.push({
        label: `You have runway before ${criticalWeeks[0].week} — use it to make real progress on "${heaviest.title}" instead of waiting until you're already under pressure`,
        tag: "Get ahead",
      });
    }
  }

  return recs.slice(0, 5);
}
