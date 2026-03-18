"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "../components/ui";

// ── Transform raw Claude output → Scenario ───────────────────────────────────

type RawAnalysis = {
  assignments: { name: string; due_date: string | null; points: string | null }[];
  exams:       { name: string; date: string | null; type: string }[];
  deadlines:   { name: string; date: string | null }[];
};

function rawToScenario(data: RawAnalysis): Scenario {
  const total     = data.assignments.length + data.exams.length * 1.5 + data.deadlines.length * 0.5;
  const riskScore = Math.min(95, Math.max(5, Math.round(total * 5)));
  const riskLabel = riskScore >= 60 ? "High" : riskScore >= 35 ? "Medium" : "Low";

  // Group items by date to find the busiest weeks
  const byDate = new Map<string, string[]>();
  for (const a of data.assignments) {
    if (a.due_date) byDate.set(a.due_date, [...(byDate.get(a.due_date) ?? []), a.name]);
  }
  for (const e of data.exams) {
    if (e.date) byDate.set(e.date, [...(byDate.get(e.date) ?? []), `${e.name} (${e.type})`]);
  }
  const dangerWeeks = [...byDate.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([week, reasons]) => ({
      week,
      load: (reasons.length >= 3 ? "Critical" : reasons.length >= 2 ? "High" : "Medium") as "Critical" | "High" | "Medium",
      reasons,
    }));

  const assignments = data.assignments.map((a) => ({
    course: "Your course",
    title: a.name,
    due: a.due_date ?? "TBD",
    risk: "medium" as RiskLevel,
    weight: a.points ?? "—",
  }));

  const exams = data.exams.map((e) => ({
    course: "Your course",
    title: e.name,
    date: e.date ?? "TBD",
    prep: "See syllabus",
    risk: (e.type === "Final" ? "high" : "medium") as RiskLevel,
    topics: e.type,
  }));

  const actions: Scenario["actions"] = [
    ...data.exams.slice(0, 2).map((e, i) => ({
      priority: i + 1,
      label: `Prepare for ${e.name}${e.date ? ` on ${e.date}` : ""} — start studying early`,
      tag: e.type === "Final" ? "Final exam" : "Exam",
    })),
    ...data.assignments.filter((a) => a.points != null).slice(0, 2).map((a, i) => ({
      priority: i + 3,
      label: `${a.name}${a.due_date ? ` — due ${a.due_date}` : ""}${a.points ? ` (${a.points})` : ""}`,
      tag: "Assignment",
    })),
    ...data.deadlines.slice(0, 2).map((d, i) => ({
      priority: i + 5,
      label: `Don't miss: ${d.name}${d.date ? ` on ${d.date}` : ""}`,
      tag: "Deadline",
    })),
  ];

  const riskNote =
    riskLabel === "High"   ? `${data.assignments.length} assignments + ${data.exams.length} exams detected. Plan early.` :
    riskLabel === "Medium" ? `${data.assignments.length} assignments + ${data.exams.length} exams detected. Stay on schedule.` :
                             `${data.assignments.length} assignments + ${data.exams.length} exams detected. Light load.`;

  return {
    id: "your-analysis",
    label: "Your Analysis",
    semester: "Your Semester",
    riskScore,
    riskLabel,
    riskNote,
    courses: [],
    dangerWeeks,
    assignments,
    exams,
    actions,
  };
}

// ── Types ───────────────────────────────────────────────────────────────────

type RiskLevel = "high" | "medium" | "low";
type WeekLoad  = "Critical" | "High" | "Medium";

interface Scenario {
  id: string;
  label: string;
  semester: string;
  riskScore: number;
  riskLabel: "High" | "Medium" | "Low";
  riskNote: string;
  courses: { name: string; code: string; credits: number }[];
  dangerWeeks: { week: string; load: WeekLoad; reasons: string[] }[];
  assignments: { course: string; title: string; due: string; risk: RiskLevel; weight: string }[];
  exams: { course: string; title: string; date: string; prep: string; risk: RiskLevel; topics: string }[];
  actions: { priority: number; label: string; tag: string }[];
}

// ── Mock scenarios ──────────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  {
    id: "high-risk",
    label: "High Risk",
    semester: "Spring 2025",
    riskScore: 72,
    riskLabel: "High",
    riskNote: "High-pressure window ahead. Immediate action recommended.",
    courses: [
      { name: "Calculus II",         code: "MATH 202", credits: 4 },
      { name: "Data Structures",     code: "CS 301",   credits: 3 },
      { name: "Physics I",           code: "PHYS 101", credits: 4 },
      { name: "English Composition", code: "ENG 110",  credits: 3 },
      { name: "Intro to Psychology", code: "PSY 101",  credits: 3 },
    ],
    dangerWeeks: [
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
    ],
    assignments: [
      { course: "CS 301",   title: "Binary Trees Implementation", due: "Mar 21", risk: "high",   weight: "15%" },
      { course: "MATH 202", title: "Problem Set 8",               due: "Mar 22", risk: "medium", weight: "5%"  },
      { course: "PHYS 101", title: "Lab Report — Wave Motion",    due: "Mar 26", risk: "high",   weight: "10%" },
      { course: "ENG 110",  title: "Argumentative Essay Draft",   due: "Apr 4",  risk: "medium", weight: "20%" },
      { course: "PSY 101",  title: "Chapter 9–11 Reading Quiz",   due: "Mar 24", risk: "low",    weight: "5%"  },
      { course: "MATH 202", title: "Problem Set 9",               due: "Mar 29", risk: "low",    weight: "5%"  },
    ],
    exams: [
      { course: "MATH 202", title: "Midterm II",  date: "Mar 26", prep: "3 days", risk: "high",   topics: "Integration by parts, Series"   },
      { course: "CS 301",   title: "Midterm",     date: "Mar 27", prep: "2 days", risk: "high",   topics: "Trees, Graphs, Sorting"         },
      { course: "PHYS 101", title: "Midterm II",  date: "Apr 9",  prep: "5 days", risk: "medium", topics: "Waves, Thermodynamics"          },
      { course: "PSY 101",  title: "Unit 3 Exam", date: "Apr 14", prep: "7 days", risk: "low",    topics: "Cognition, Memory, Learning"    },
    ],
    actions: [
      { priority: 1, label: "Start CS 301 Binary Trees today — due in 4 days",             tag: "Urgent"      },
      { priority: 2, label: "Block 3 hrs/day Mar 23–25 for MATH 202 midterm prep",         tag: "Study block" },
      { priority: 3, label: "Draft Physics lab outline before Mar 24 crunch week",          tag: "Get ahead"   },
      { priority: 4, label: "Visit office hours for Calculus II series problems",           tag: "Support"     },
      { priority: 5, label: "Outline English essay this weekend to avoid Apr crunch",       tag: "Plan ahead"  },
    ],
  },
  {
    id: "balanced",
    label: "Balanced",
    semester: "Fall 2024",
    riskScore: 44,
    riskLabel: "Medium",
    riskNote: "Manageable workload. Stay consistent and you'll be fine.",
    courses: [
      { name: "Linear Algebra",      code: "MATH 301", credits: 3 },
      { name: "Algorithms",          code: "CS 401",   credits: 3 },
      { name: "Macroeconomics",      code: "ECON 201", credits: 3 },
      { name: "Technical Writing",   code: "ENG 220",  credits: 2 },
    ],
    dangerWeeks: [
      {
        week: "Oct 14 – Oct 18",
        load: "High",
        reasons: ["CS 401 algorithm analysis project", "MATH 301 midterm", "ECON essay outline due"],
      },
      {
        week: "Nov 18 – Nov 22",
        load: "Medium",
        reasons: ["CS 401 final project milestone", "ECON 201 problem set", "ENG 220 portfolio draft"],
      },
      {
        week: "Dec 9 – Dec 13",
        load: "High",
        reasons: ["Final exams week", "MATH 301 final", "CS 401 final project demo"],
      },
    ],
    assignments: [
      { course: "CS 401",   title: "Sorting Algorithm Analysis",  due: "Oct 16", risk: "medium", weight: "12%" },
      { course: "MATH 301", title: "Eigenvalue Problem Set",      due: "Oct 18", risk: "medium", weight: "8%"  },
      { course: "ECON 201", title: "Market Analysis Essay",       due: "Oct 25", risk: "low",    weight: "15%" },
      { course: "ENG 220",  title: "Technical Report Draft",      due: "Nov 1",  risk: "low",    weight: "20%" },
      { course: "CS 401",   title: "Graph Traversal Project",     due: "Nov 20", risk: "medium", weight: "18%" },
    ],
    exams: [
      { course: "MATH 301", title: "Midterm",       date: "Oct 17", prep: "5 days", risk: "medium", topics: "Eigenvalues, Matrix decomposition"  },
      { course: "CS 401",   title: "Midterm",       date: "Oct 22", prep: "4 days", risk: "medium", topics: "Complexity, Dynamic programming"    },
      { course: "ECON 201", title: "Unit 2 Exam",   date: "Nov 5",  prep: "7 days", risk: "low",    topics: "GDP, Inflation, Monetary policy"    },
      { course: "MATH 301", title: "Final",         date: "Dec 11", prep: "7 days", risk: "medium", topics: "Full semester review"               },
    ],
    actions: [
      { priority: 1, label: "Begin sorting analysis writeup — mid complexity section first",  tag: "Start now"   },
      { priority: 2, label: "Review eigenvalue proofs before MATH 301 midterm Oct 17",        tag: "Study block" },
      { priority: 3, label: "Draft ECON essay thesis this weekend",                           tag: "Get ahead"   },
      { priority: 4, label: "Schedule CS 401 office hours for dynamic programming gaps",      tag: "Support"     },
    ],
  },
  {
    id: "light-load",
    label: "Light Load",
    semester: "Summer 2025",
    riskScore: 18,
    riskLabel: "Low",
    riskNote: "Low stress semester. Good time to get ahead or explore electives.",
    courses: [
      { name: "Art History",         code: "ART 101",  credits: 3 },
      { name: "Intro to Sociology",  code: "SOC 110",  credits: 3 },
      { name: "Spanish II",          code: "SPAN 102", credits: 3 },
    ],
    dangerWeeks: [
      {
        week: "Jun 16 – Jun 20",
        load: "Medium",
        reasons: ["ART 101 museum essay due", "SPAN 102 oral exam", "SOC reading response"],
      },
      {
        week: "Jul 14 – Jul 18",
        load: "Medium",
        reasons: ["Final exams begin", "SOC 110 final paper", "ART 101 presentation"],
      },
      {
        week: "Jul 21 – Jul 25",
        load: "High",
        reasons: ["SPAN 102 comprehensive final", "SOC 110 group project due"],
      },
    ],
    assignments: [
      { course: "ART 101",  title: "Renaissance Comparison Essay", due: "Jun 18", risk: "low",    weight: "20%" },
      { course: "SOC 110",  title: "Reading Response #4",          due: "Jun 20", risk: "low",    weight: "10%" },
      { course: "SPAN 102", title: "Conversational Dialogue",      due: "Jun 25", risk: "low",    weight: "15%" },
      { course: "SOC 110",  title: "Final Research Paper",         due: "Jul 16", risk: "medium", weight: "35%" },
    ],
    exams: [
      { course: "SPAN 102", title: "Oral Exam",     date: "Jun 19", prep: "3 days", risk: "low",    topics: "Present tense, Vocabulary units 4–6"   },
      { course: "ART 101",  title: "Final",         date: "Jul 15", prep: "5 days", risk: "low",    topics: "Modern to Contemporary art movements"  },
      { course: "SOC 110",  title: "Final",         date: "Jul 17", prep: "5 days", risk: "medium", topics: "Social theory, Institutions, Culture"   },
      { course: "SPAN 102", title: "Written Final", date: "Jul 22", prep: "7 days", risk: "low",    topics: "Grammar, Reading comprehension"         },
    ],
    actions: [
      { priority: 1, label: "Start SOC final paper outline early — it's 35% of grade",    tag: "High value"  },
      { priority: 2, label: "Practice SPAN dialogue 15 min daily through Jun 19",          tag: "Consistency" },
      { priority: 3, label: "Use light workload to get ahead on ART essay research",       tag: "Get ahead"   },
    ],
  },
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

const SCORE_RING_COLOR = {
  High:   "stroke-red-600 dark:stroke-red-500",
  Medium: "stroke-amber-500 dark:stroke-amber-400",
  Low:    "stroke-green-500 dark:stroke-green-400",
} as const;

const SCORE_LABEL_BG = {
  High:   "bg-red-600 dark:bg-red-700",
  Medium: "bg-amber-500 dark:bg-amber-600",
  Low:    "bg-green-500 dark:bg-green-600",
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
  Medium: {
    wrapper: "border-blue-200  bg-blue-50  dark:border-blue-900/50  dark:bg-blue-950/20",
    badge:   "border-blue-200  text-blue-700  dark:border-blue-800 dark:text-blue-400",
    text:    "text-slate-700   dark:text-slate-300",
  },
} as const;

function RiskBadge({ level }: { level: RiskLevel }) {
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
  const [scenarios, setScenarios] = useState<Scenario[]>(SCENARIOS);
  const [activeId,  setActiveId]  = useState("high-risk");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("gr:analysis");
      if (!raw) return;
      const real = rawToScenario(JSON.parse(raw) as RawAnalysis);
      setScenarios([real, ...SCENARIOS]);
      setActiveId("your-analysis");
    } catch {
      // corrupt data — fall back to mock scenarios silently
    }
  }, []);

  const s = scenarios.find((x) => x.id === activeId) ?? scenarios[0];

  const scoreDash   = 283;
  const scoreOffset = scoreDash - (scoreDash * s.riskScore) / 100;

  return (
    <div className="min-h-screen bg-[#fdf4e7] text-red-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-10 pb-20 sm:px-6 lg:px-8">

        {/* Page meta row */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-500 dark:text-indigo-400">
            {s.semester} · Risk Dashboard
          </p>
          <Link
            href="/upload"
            className="text-xs font-medium text-red-400 underline underline-offset-2 hover:text-red-600 dark:text-slate-500 dark:hover:text-indigo-400"
          >
            ← Run new analysis
          </Link>
        </div>

        {/* ── Scenario switcher ── */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-widest text-red-400 dark:text-slate-500">
            Test scenario
          </span>
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => setActiveId(sc.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                activeId === sc.id
                  ? sc.riskLabel === "High"
                    ? "bg-red-600 text-white shadow-sm dark:bg-red-700"
                    : sc.riskLabel === "Medium"
                    ? "bg-amber-500 text-white shadow-sm dark:bg-amber-600"
                    : "bg-green-500 text-white shadow-sm dark:bg-green-600"
                  : "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {sc.label}
            </button>
          ))}
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
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={scoreDash} strokeDashoffset={scoreOffset}
                  className={`transition-all duration-700 ${SCORE_RING_COLOR[s.riskLabel]}`}
                />
              </svg>
              <div className="leading-none">
                <span className="text-3xl font-bold text-red-700 dark:text-white">{s.riskScore}</span>
                <span className="text-sm text-red-400 dark:text-slate-500">/100</span>
              </div>
            </div>
            <span className={`rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wide text-white transition-colors duration-300 ${SCORE_LABEL_BG[s.riskLabel]}`}>
              {s.riskLabel} Risk
            </span>
            <p className="text-xs leading-relaxed text-red-400/80 dark:text-slate-500">
              {s.riskNote}
            </p>
          </Panel>

          {/* Course list */}
          <Panel className="p-5">
            <SectionHeading>Enrolled courses</SectionHeading>
            <ul className="divide-y divide-red-50 dark:divide-slate-700/60">
              {s.courses.map((c) => (
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
                {s.courses.reduce((sum, c) => sum + c.credits, 0)} credits
              </p>
            </div>
          </Panel>

        </div>

        {/* ── Danger weeks ── */}
        <section className="mt-8">
          <SectionHeading>Danger weeks</SectionHeading>
          <div className="grid gap-3 sm:grid-cols-3">
            {s.dangerWeeks.map((w) => {
              const st = WEEK_STYLES[w.load];
              return (
                <div key={w.week} className={`rounded-2xl border p-5 ${st.wrapper}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{w.week}</p>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${st.badge}`}>
                      {w.load}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {w.reasons.map((r) => (
                      <li key={r} className={`flex items-start gap-2 text-xs ${st.text}`}>
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
                {s.assignments.map((a) => (
                  <li key={a.title} className="flex items-start justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-red-900 dark:text-slate-100">{a.title}</p>
                      <p className="mt-0.5 text-xs text-red-400 dark:text-slate-500">
                        {a.course} · Due {a.due} · {a.weight}
                      </p>
                    </div>
                    <RiskBadge level={a.risk} />
                  </li>
                ))}
              </ul>
            </Panel>
          </section>

          <section>
            <SectionHeading>Upcoming exams</SectionHeading>
            <Panel>
              <ul className="divide-y divide-red-50 dark:divide-slate-700/60">
                {s.exams.map((e) => (
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
                      <RiskBadge level={e.risk} />
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
              {s.actions.map((a) => (
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
