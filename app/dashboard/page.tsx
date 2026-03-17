import Link from "next/link";
import { SiteHeader } from "../components/ui";

// ── Mock data ──────────────────────────────────────────────────────────────

const RISK_SCORE = 72;
const RISK_LABEL = "High" as const;

const COURSES = [
  { name: "Calculus II",         code: "MATH 202", credits: 4 },
  { name: "Data Structures",     code: "CS 301",   credits: 3 },
  { name: "Physics I",           code: "PHYS 101", credits: 4 },
  { name: "English Composition", code: "ENG 110",  credits: 3 },
  { name: "Intro to Psychology", code: "PSY 101",  credits: 3 },
];

const DANGER_WEEKS = [
  {
    week: "Mar 24 – Mar 28",
    load: "Critical" as const,
    reasons: ["Calculus II midterm", "Data Structures project due", "Physics lab report", "PSY reading quiz"],
  },
  {
    week: "Apr 7 – Apr 11",
    load: "High" as const,
    reasons: ["Physics I midterm", "English essay due", "CS 301 homework set"],
  },
  {
    week: "Apr 28 – May 2",
    load: "High" as const,
    reasons: ["Final exam period begins", "MATH 202 final", "Group project presentations"],
  },
];

const ASSIGNMENTS = [
  { course: "CS 301",   title: "Binary Trees Implementation", due: "Mar 21", risk: "high",   weight: "15%" },
  { course: "MATH 202", title: "Problem Set 8",               due: "Mar 22", risk: "medium", weight: "5%"  },
  { course: "PHYS 101", title: "Lab Report — Wave Motion",    due: "Mar 26", risk: "high",   weight: "10%" },
  { course: "ENG 110",  title: "Argumentative Essay Draft",   due: "Apr 4",  risk: "medium", weight: "20%" },
  { course: "PSY 101",  title: "Chapter 9–11 Reading Quiz",   due: "Mar 24", risk: "low",    weight: "5%"  },
  { course: "MATH 202", title: "Problem Set 9",               due: "Mar 29", risk: "low",    weight: "5%"  },
];

const EXAMS = [
  { course: "MATH 202", title: "Midterm II",  date: "Mar 26", prep: "3 days", risk: "high",   topics: "Integration by parts, Series"   },
  { course: "CS 301",   title: "Midterm",     date: "Mar 27", prep: "2 days", risk: "high",   topics: "Trees, Graphs, Sorting"         },
  { course: "PHYS 101", title: "Midterm II",  date: "Apr 9",  prep: "5 days", risk: "medium", topics: "Waves, Thermodynamics"          },
  { course: "PSY 101",  title: "Unit 3 Exam", date: "Apr 14", prep: "7 days", risk: "low",    topics: "Cognition, Memory, Learning"    },
];

const ACTIONS = [
  { priority: 1, label: "Start CS 301 Binary Trees today — due in 4 days",              tag: "Urgent"      },
  { priority: 2, label: "Block 3 hrs/day Mar 23–25 for MATH 202 midterm prep",          tag: "Study block" },
  { priority: 3, label: "Draft Physics lab outline before Mar 24 crunch week",           tag: "Get ahead"   },
  { priority: 4, label: "Visit office hours for Calculus II series problems",            tag: "Support"     },
  { priority: 5, label: "Outline English essay this weekend to avoid Apr crunch",        tag: "Plan ahead"  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const RISK_BADGE = {
  high:   "bg-red-100   text-red-700   dark:bg-red-900/40   dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  low:    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
} as const;

const RISK_DOT = {
  high:   "bg-red-500",
  medium: "bg-amber-500",
  low:    "bg-green-500",
} as const;

const WEEK_STYLES = {
  Critical: {
    wrapper: "border-red-200   bg-red-50   dark:border-red-900/50   dark:bg-red-950/20",
    badge:   "border-red-200   text-red-700   dark:border-red-800 dark:text-red-400",
    text:    "text-slate-700   dark:text-slate-300",
  },
  High: {
    wrapper: "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20",
    badge:   "border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400",
    text:    "text-slate-700   dark:text-slate-300",
  },
} as const;

function RiskBadge({ level }: { level: "high" | "medium" | "low" }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${RISK_BADGE[level]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${RISK_DOT[level]}`} />
      {level}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-red-500 dark:text-indigo-400">
      {children}
    </p>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/70 ${className}`}>
      {children}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const scoreDash   = 283;
  const scoreOffset = scoreDash - (scoreDash * RISK_SCORE) / 100;

  return (
    <div className="min-h-screen bg-[#fdf4e7] text-red-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-10 pb-20 sm:px-6 lg:px-8">

        {/* Page meta row */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-500 dark:text-indigo-400">
            Spring 2025 · Risk Dashboard
          </p>
          <Link
            href="/upload"
            className="text-xs font-medium text-red-400 underline underline-offset-2 hover:text-red-600 dark:text-slate-500 dark:hover:text-indigo-400"
          >
            ← Run new analysis
          </Link>
        </div>

        {/* ── Risk score + courses ── */}
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">

          {/* Risk score */}
          <Panel className="flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-400 dark:text-slate-500">
              Overall Risk Score
            </p>
            <div className="relative flex h-32 w-32 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor"
                  className="text-red-100 dark:text-slate-700" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none"
                  stroke="#dc2626" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={scoreDash} strokeDashoffset={scoreOffset}
                  className="dark:stroke-indigo-500"
                />
              </svg>
              <div className="leading-none">
                <span className="text-3xl font-bold text-red-700 dark:text-white">{RISK_SCORE}</span>
                <span className="text-sm text-red-400 dark:text-slate-500">/100</span>
              </div>
            </div>
            <span className="rounded-full bg-red-600 px-4 py-1 text-xs font-bold uppercase tracking-wide text-white dark:bg-red-700">
              {RISK_LABEL} Risk
            </span>
            <p className="text-xs leading-relaxed text-red-400/80 dark:text-slate-500">
              High-pressure window ahead. Immediate action recommended.
            </p>
          </Panel>

          {/* Course list */}
          <Panel className="p-5">
            <SectionHeading>Enrolled courses</SectionHeading>
            <ul className="divide-y divide-red-50 dark:divide-slate-700/60">
              {COURSES.map((c) => (
                <li key={c.code} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-red-900 dark:text-slate-100">{c.name}</p>
                    <p className="text-xs text-red-400 dark:text-slate-500">{c.code}</p>
                  </div>
                  <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-slate-700 dark:text-slate-300">
                    {c.credits} cr
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-red-50 px-4 py-2.5 dark:bg-slate-700/40">
              <p className="text-xs text-red-600 dark:text-slate-400">Total credit load</p>
              <p className="text-sm font-bold text-red-900 dark:text-white">
                {COURSES.reduce((s, c) => s + c.credits, 0)} credits
              </p>
            </div>
          </Panel>

        </div>

        {/* ── Danger weeks ── */}
        <section className="mt-8">
          <SectionHeading>Danger weeks</SectionHeading>
          <div className="grid gap-3 sm:grid-cols-3">
            {DANGER_WEEKS.map((w) => {
              const s = WEEK_STYLES[w.load];
              return (
                <div key={w.week} className={`rounded-2xl border p-5 ${s.wrapper}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{w.week}</p>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.badge}`}>
                      {w.load}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {w.reasons.map((r) => (
                      <li key={r} className={`flex items-start gap-2 text-xs ${s.text}`}>
                        <span className="mt-0.5 shrink-0 opacity-40">—</span>
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

          <section>
            <SectionHeading>Upcoming assignments</SectionHeading>
            <Panel>
              <ul className="divide-y divide-red-50 dark:divide-slate-700/60">
                {ASSIGNMENTS.map((a) => (
                  <li key={a.title} className="flex items-start justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-red-900 dark:text-slate-100">{a.title}</p>
                      <p className="mt-0.5 text-xs text-red-400 dark:text-slate-500">
                        {a.course} · Due {a.due} · {a.weight}
                      </p>
                    </div>
                    <RiskBadge level={a.risk as "high" | "medium" | "low"} />
                  </li>
                ))}
              </ul>
            </Panel>
          </section>

          <section>
            <SectionHeading>Upcoming exams</SectionHeading>
            <Panel>
              <ul className="divide-y divide-red-50 dark:divide-slate-700/60">
                {EXAMS.map((e) => (
                  <li key={e.title} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-red-900 dark:text-slate-100">
                          {e.course} — {e.title}
                        </p>
                        <p className="mt-0.5 text-xs text-red-400 dark:text-slate-500">
                          {e.date} · Prep: {e.prep}
                        </p>
                      </div>
                      <RiskBadge level={e.risk as "high" | "medium" | "low"} />
                    </div>
                    <p className="mt-1.5 text-xs text-red-600/60 dark:text-slate-500">
                      {e.topics}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          </section>

        </div>

        {/* ── Recommended actions ── */}
        <section className="mt-8">
          <SectionHeading>Recommended actions</SectionHeading>
          <Panel>
            <ul className="divide-y divide-red-50 dark:divide-slate-700/60">
              {ACTIONS.map((a) => (
                <li key={a.priority} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white dark:bg-indigo-600">
                    {a.priority}
                  </span>
                  <p className="flex-1 text-sm text-red-800 dark:text-slate-200">{a.label}</p>
                  <span className="hidden shrink-0 rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400 sm:inline-flex">
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
