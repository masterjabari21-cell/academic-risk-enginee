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
  for (const item of items) {
    const d = parseDate(item.date);
    if (!d) continue;
    const key  = toWeekKey(d);
    const load = KIND_WEIGHT[item.kind] ?? 1;
    weekLoads.set(key,  (weekLoads.get(key)  ?? 0) + load);
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
    if (item.kind === "exam") examCount++;
  }

  if (weekLoads.size === 0) {
    return {
      score: 10,
      label: "Low",
      explanation: "No dated items found yet — add some to get your risk score.",
      scoreReasons: ["No dated items detected"],
    };
  }

  const allLoads  = [...weekLoads.values()];
  const totalWeeks = allLoads.length;

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
  const dangerStr =
    dangerCount === 0 ? "no high-density weeks" :
    dangerCount === 1 ? "1 high-density week" :
    `${dangerCount} high-density weeks`;
  const examStr = examCount === 1 ? "1 exam" : `${examCount} exams`;
  const explanation =
    `${avgLoad.toFixed(1)} avg weighted items/week across ${totalWeeks} active weeks, ` +
    `peaking at ${weekCounts.get(maxWeekKey) ?? 0} items during ${maxWeekKey}. ` +
    `${examStr} this semester with ${dangerStr}.`;

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
 * Generates 3–5 specific, pattern-based recommendations.
 *
 * Patterns detected:
 * - Exam + project collision within 7 days → start project earlier
 * - 3+ items due within 5 days → front-load the lightest task
 * - 2+ adjacent high-intensity weeks → spread prep across both
 * - 3+ exams (esp. finals) → build a study schedule now
 * - High-weight assignment due near an exam → block time early
 * - Calm stretch before first danger week → opportunity to get ahead
 */
export function generateRecommendations(
  items: RiskItem[],
  dangerWeeks: { week: string; load: "Critical" | "High" | "Medium" }[],
): Recommendation[] {
  const recs: Recommendation[] = [];

  type Dated = RiskItem & { parsedDate: Date };
  const dated: Dated[] = items
    .map((i) => ({ ...i, parsedDate: parseDate(i.date)! }))
    .filter((i) => i.parsedDate !== null);

  const exams    = dated.filter((i) => i.kind === "exam");
  const projects = dated.filter((i) => i.kind === "project");
  const assigns  = dated.filter((i) => i.kind === "assignment");

  // ── 1. Exam + project collision ──────────────────────────────────────────
  for (const exam of exams) {
    const collision = projects.find(
      (p) => Math.abs(exam.parsedDate.getTime() - p.parsedDate.getTime()) <= 7 * 86_400_000
    );
    if (collision) {
      recs.push({
        label: `"${collision.title}" (due ${fmtDate(collision.parsedDate)}) overlaps with your ${exam.title} on ${fmtDate(exam.parsedDate)} — start the project at least a week early so exam prep isn't rushed`,
        tag: "Schedule conflict",
      });
      break;
    }
  }

  // ── 2. 3+ items close together ────────────────────────────────────────────
  const sorted = [...dated].sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  let clusterFound = false;
  for (let i = 0; i < sorted.length && !clusterFound; i++) {
    const anchor = sorted[i].parsedDate.getTime();
    const window = sorted.filter((x) => {
      const diff = x.parsedDate.getTime() - anchor;
      return diff >= 0 && diff <= 5 * 86_400_000;
    });
    if (window.length >= 3) {
      clusterFound = true;
      const startStr = fmtDate(sorted[i].parsedDate);
      const endDate  = new Date(Math.max(...window.map((x) => x.parsedDate.getTime())));
      const endStr   = fmtDate(endDate);
      // Recommend finishing the lightest item first
      const lightest = [...window].sort((a, b) => KIND_WEIGHT[a.kind] - KIND_WEIGHT[b.kind])[0];
      recs.push({
        label: `${window.length} items are due between ${startStr}–${endStr} — finish "${lightest.title}" ahead of time to protect space for the heavier ones`,
        tag: "Front-load",
      });
    }
  }

  // ── 3. Adjacent high-intensity weeks ──────────────────────────────────────
  const heavy = dangerWeeks.filter((w) => w.load === "Critical" || w.load === "High");
  if (heavy.length >= 2) {
    recs.push({
      label: `${heavy[0].week} and ${heavy[1].week} are both high-intensity — start prep two weeks out and spread study sessions across both stretches`,
      tag: "Spread prep",
    });
  }

  // ── 4. Heavy exam period ──────────────────────────────────────────────────
  if (exams.length >= 3) {
    const finals = exams.filter((e) => /final|comprehensive/i.test(e.title));
    if (finals.length >= 2) {
      recs.push({
        label: `${finals.length} finals are on the calendar — build a study schedule now so cramming isn't your only option`,
        tag: "Study plan",
      });
    } else {
      recs.push({
        label: `${exams.length} exams across the semester — 30-minute review sessions 3× a week consistently beat a last-minute cram`,
        tag: "Study plan",
      });
    }
  }

  // ── 5. High-weight assignment due near an exam ────────────────────────────
  if (recs.length < 4) {
    for (const a of [...assigns, ...projects]) {
      const w = weightPct(a.weight);
      if (w < 20) continue;
      const nearExam = exams.find(
        (e) => Math.abs(e.parsedDate.getTime() - a.parsedDate.getTime()) <= 5 * 86_400_000
      );
      if (nearExam) {
        recs.push({
          label: `"${a.title}" (${a.weight}, due ${fmtDate(a.parsedDate)}) falls near an exam — block time for it now before the exam-prep window opens`,
          tag: "Prioritize",
        });
        break;
      }
    }
  }

  // ── 6. Calm stretch: opportunity to get ahead ────────────────────────────
  if (dangerWeeks.length > 0 && recs.length < 3) {
    recs.push({
      label: `Use lighter weeks before ${dangerWeeks[0].week} to get ahead on reading and draft work — front-loading pays off when the crunch hits`,
      tag: "Get ahead",
    });
  }

  return recs.slice(0, 5);
}
