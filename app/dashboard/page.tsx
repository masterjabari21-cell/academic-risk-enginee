import Link from "next/link";
import { SiteHeader } from "../components/ui";

// ── Mock data ──────────────────────────────────────────────────────────────

const RISK_SCORE = 72;
const RISK_LABEL = "High" as const;

const COURSES = [
  { name: "Calculus II",          code: "MATH 202", credits: 4 },
  { name: "Data Structures",      code: "CS 301",   credits: 3 },
  { name: "Physics I",            code: "PHYS 101", credits: 4 },
  { name: "English Composition",  code: "ENG 110",  credits: 3 },
  { name: "Intro to Psychology",  code: "PSY 101",  credits: 3 },
];

const DANGER_WEEKS = [
  {
    week: "Mar 24 – Mar 28",
    load: "Critical",
    reasons: ["Calculus II midterm", "Data Structures project due", "Physics lab report", "PSY reading quiz"],
  },
  {
    week: "Apr 7 – Apr 11",
    load: "High",
    reasons: ["Physics I midterm", "English essay due", "CS 301 homework set"],
  },
  {
    week: "Apr 28 – May 2",
    load: "High",
    reasons: ["Final exam period begins", "MATH 202 final", "Group project presentations"],
  },
];

const ASSIGNMENTS = [
  { course: "CS 301",   title: "Binary Trees Implementation",  due: "Mar 21",  risk: "high",   weight: "15%" },
  { course: "MATH 202", title: "Problem Set 8",                due: "Mar 22",  risk: "medium", weight: "5%"  },
  { course: "PHYS 101", title: "Lab Report — Wave Motion",     due: "Mar 26",  risk: "high",   weight: "10%" },
  { course: "ENG 110",  title: "Argumentative Essay Draft",    due: "Apr 4",   risk: "medium", weight: "20%" },
  { course: "PSY 101",  title: "Chapter 9–11 Reading Quiz",    due: "Mar 24",  risk: "low",    weight: "5%"  },
  { course: "MATH 202", title: "Problem Set 9",                due: "Mar 29",  risk: "low",    weight: "5%"  },
];

const EXAMS = [
  { course: "MATH 202", title: "Midterm II",   date: "Mar 26", prep: "3 days",  risk: "high",   topics: "Integration by parts, Series" },
  { course: "CS 301",   title: "Midterm",      date: "Mar 27", prep: "2 days",  risk: "high",   topics: "Trees, Graphs, Sorting" },
  { course: "PHYS 101", title: "Midterm II",   date: "Apr 9",  prep: "5 days",  risk: "medium", topics: "Waves, Thermodynamics" },
  { course: "PSY 101",  title: "Unit 3 Exam",  date: "Apr 14", prep: "7 days",  risk: "low",    topics: "Cognition, Memory, Learning" },
];

const ACTIONS = [
  { priority: 1, label: "Start CS 301 Binary Trees today — due in 4 days", tag: "Urgent" },
  { priority: 2, label: "Block 3 hrs/day Mar 23–25 for MATH 202 midterm prep", tag: "Study block" },
  { priority: 3, label: "Draft Physics lab outline before Mar 24 crunch week", tag: "Get ahead" },
  { priority: 4, label: "Visit office hours for Calculus II series problems", tag: "Support" },
  { priority: 5, label: "Outline English essay this weekend to avoid Apr crunch", tag: "Plan ahead" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const riskColors = {
  high:     { badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",     dot: "bg-red-500"    },
  medium:   { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400", dot: "bg-amber-500" },
  low:      { badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400", dot: "bg-green-500" },
  Critical: { bar: "bg-red-600",    border: "border-red-200 dark:border-red-800/60",  bg: "bg-red-50 dark:bg-red-950/20",  text: "text-red-700 dark:text-red-400" },
  High:     { bar: "bg-amber-500",  border: "border-amber-200 dark:border-amber-800/60", bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-400" },
};

function RiskBadge({ level }: { level: "high" | "medium" | "low" }) {
  const c = riskColors[level];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${c.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {level}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-red-500 dark:text-indigo-400">
      {children}
    </p>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-red-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/70 ${className}`}>
      {children}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const scorePercent = RISK_SCORE;
  const scoreDash = 283; // circumference of r=45 circle
  const scoreOffset = scoreDash - (scoreDash * scorePercent) / 100;

  return (
    <div className="min-h-screen bg-[#fdf4e7] text-red-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">

        {/* ── Top label ── */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500 dark:text-indigo-400">
            Spring 2025 &nbsp;·&nbsp; Risk Dashboard
          </p>
          <Link
            href="/upload"
            className="text-xs text-red-400 underline underline-offset-2 hover:text-red-600 dark:text-slate-500 dark:hover:text-indigo-400"
          >
            ← Run new analysis
          </Link>
        </div>

        {/* ── Hero risk card + course list ── */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">

          {/* Risk score */}
          <Panel className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-400 dark:text-slate-400">
              Overall Risk Score
            </p>
            <div className="relative my-6 flex h-36 w-36 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor"
                  className="text-red-100 dark:text-slate-700" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none"
                  stroke="#dc2626" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={scoreDash}
                  strokeDashoffset={scoreOffset}
                  className="transition-all duration-1000 dark:stroke-indigo-500"
                />
              </svg>
              <div>
                <span className="text-4xl font-bold text-red-700 dark:text-white">{RISK_SCORE}</span>
                <span className="text-lg text-red-400 dark:text-slate-400">/100</span>
              </div>
            </div>
            <span className="rounded-full bg-red-600 px-5 py-1.5 text-sm font-bold text-white dark:bg-red-700">
              {RISK_LABEL} Risk
            </span>
            <p className="mt-4 max-w-[200px] text-xs leading-relaxed text-red-400/80 dark:text-slate-500">
              Your semester is entering a high-pressure window. Immediate action recommended.
            </p>
          </Panel>

          {/* Course list */}
          <Panel className="p-6">
            <SectionLabel>Enrolled courses</SectionLabel>
            <ul className="divide-y divide-red-50 dark:divide-slate-700">
              {COURSES.map((c) => (
                <li key={c.code} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-red-900 dark:text-slate-100">{c.name}</p>
                    <p className="text-xs text-red-400 dark:text-slate-500">{c.code}</p>
                  </div>
                  <span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 dark:bg-slate-700 dark:text-slate-300">
                    {c.credits} cr
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 dark:bg-slate-700/50">
              <p className="text-xs text-red-600 dark:text-slate-300">Total credit load</p>
              <p className="text-sm font-bold text-red-900 dark:text-white">
                {COURSES.reduce((s, c) => s + c.credits, 0)} credits
              </p>
            </div>
          </Panel>
        </div>

        {/* ── Danger weeks ── */}
        <section className="mt-8">
          <SectionLabel>Danger weeks</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-3">
            {DANGER_WEEKS.map((w) => {
              const c = riskColors[w.load as "Critical" | "High"];
              return (
                <div key={w.week} className={`rounded-2xl border p-5 ${c.border} ${c.bg}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-red-900 dark:text-white">{w.week}</p>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.text} border ${c.border}`}>
                      {w.load}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {w.reasons.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-xs text-red-700/80 dark:text-slate-300">
                        <span className="mt-0.5 shrink-0 text-red-400 dark:text-slate-500">—</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Assignments + Exams ── */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">

          {/* Assignments */}
          <section>
            <SectionLabel>Upcoming assignments</SectionLabel>
            <Panel>
              <ul className="divide-y divide-red-50 dark:divide-slate-700">
                {ASSIGNMENTS.map((a) => (
                  <li key={a.title} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-red-900 dark:text-slate-100">{a.title}</p>
                      <p className="mt-0.5 text-xs text-red-400 dark:text-slate-500">
                        {a.course} &nbsp;·&nbsp; Due {a.due} &nbsp;·&nbsp; Worth {a.weight}
                      </p>
                    </div>
                    <RiskBadge level={a.risk as "high" | "medium" | "low"} />
                  </li>
                ))}
              </ul>
            </Panel>
          </section>

          {/* Exams */}
          <section>
            <SectionLabel>Upcoming exams</SectionLabel>
            <Panel>
              <ul className="divide-y divide-red-50 dark:divide-slate-700">
                {EXAMS.map((e) => (
                  <li key={e.title} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-red-900 dark:text-slate-100">
                          {e.course} — {e.title}
                        </p>
                        <p className="mt-0.5 text-xs text-red-400 dark:text-slate-500">
                          {e.date} &nbsp;·&nbsp; Prep window: {e.prep}
                        </p>
                      </div>
                      <RiskBadge level={e.risk as "high" | "medium" | "low"} />
                    </div>
                    <p className="mt-2 text-xs text-red-600/70 dark:text-slate-400">
                      Topics: {e.topics}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          </section>
        </div>

        {/* ── Recommended actions ── */}
        <section className="mt-8">
          <SectionLabel>Recommended actions</SectionLabel>
          <Panel>
            <ul className="divide-y divide-red-50 dark:divide-slate-700">
              {ACTIONS.map((a) => (
                <li key={a.priority} className="flex items-center gap-4 px-5 py-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white dark:bg-indigo-600">
                    {a.priority}
                  </span>
                  <p className="flex-1 text-sm text-red-800 dark:text-slate-200">{a.label}</p>
                  <span className="hidden shrink-0 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 sm:inline-flex">
                    {a.tag}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </section>

      </main>
    </div>
  );
}
