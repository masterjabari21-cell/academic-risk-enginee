"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "../components/ui";

// ── Transform raw Claude output → Scenario ───────────────────────────────────

type RawAnalysis = {
  courses:     { name: string; code: string; credits: number }[];
  assignments: { name: string; due_date: string | null; points: string | null; course_code: string | null }[];
  exams:       { name: string; date: string | null; type: string; course_code: string | null }[];
  deadlines:   { name: string; date: string | null }[];
};

// ── Risk intelligence helpers ────────────────────────────────────────────────

function parseDate(str: string): Date | null {
  if (!str || str === "TBD" || str === "—") return null;
  // "Mar 21", "March 21", optional year
  const m = str.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/);
  if (m) {
    const year = m[3] ? parseInt(m[3]) : 2026;
    const d = new Date(`${m[1]} ${m[2]}, ${year}`);
    if (!isNaN(d.getTime())) return d;
  }
  const d2 = new Date(str);
  if (!isNaN(d2.getTime())) return d2;
  return null;
}

function weekLabel(date: Date): string {
  const day = date.getDay();
  const mon = new Date(date);
  mon.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(mon)} – ${fmt(fri)}`;
}

function inferAssignmentRisk(
  title: string,
  weight: string,
  due: string,
  allAssignments: { title: string; due: string }[],
  exams: { date: string }[]
): "high" | "medium" | "low" {
  const t = title.toLowerCase();
  const w = parseFloat(weight.replace(/[^0-9.]/g, "")) || 0;

  // Base score: 1=low, 2=medium, 3=high
  // Read the title carefully — "homework" doesn't mean easy
  let score = 2;
  if (/\b(final|capstone|thesis|comprehensive|term paper|research paper|dissertation)\b/.test(t)) score = 3;
  else if (/\b(midterm|major project|group project|presentation|portfolio|lab report|case study|practicum)\b/.test(t)) score = Math.max(score, 2);
  else if (/\b(problem set|pset|homework|hw|exercise)\b/.test(t)) score = 2; // NOT low — homework takes real time
  else if (/\b(essay|paper|report|analysis|critique|review|memo)\b/.test(t)) score = Math.max(score, 2);
  else if (/\b(quiz|reading|discussion post|reflection|participation|check-in|attendance)\b/.test(t)) score = 1;

  // Weight is the clearest signal of stakes
  if (w >= 25) score = 3;
  else if (w >= 15) score = Math.max(score, 2);
  else if (w > 0 && w <= 3) score = Math.min(score, 1);

  // Proximity: due near other deadlines or an exam → bump risk up
  const dueDate = parseDate(due);
  if (dueDate) {
    const nearby = allAssignments.filter((a) => {
      if (a.title === title) return false;
      const d = parseDate(a.due);
      return d && Math.abs(d.getTime() - dueDate.getTime()) <= 3 * 86400000;
    });
    const nearExams = exams.filter((e) => {
      const d = parseDate(e.date);
      return d && Math.abs(d.getTime() - dueDate.getTime()) <= 5 * 86400000;
    });
    if (nearby.length >= 2 || nearExams.length >= 1) score = Math.min(3, score + 1);
  }

  return score >= 3 ? "high" : score <= 1 ? "low" : "medium";
}

function rebuildDangerWeeks(
  assignments: { title: string; due: string }[],
  exams: { title: string; date: string }[]
): { week: string; load: "Critical" | "High" | "Medium"; reasons: string[] }[] {
  const map = new Map<string, string[]>();
  for (const a of assignments) {
    const d = parseDate(a.due);
    if (!d) continue;
    const key = weekLabel(d);
    map.set(key, [...(map.get(key) ?? []), a.title]);
  }
  for (const e of exams) {
    const d = parseDate(e.date);
    if (!d) continue;
    const key = weekLabel(d);
    map.set(key, [...(map.get(key) ?? []), `${e.title} (exam)`]);
  }
  return [...map.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([week, reasons]) => ({
      week,
      load: (reasons.length >= 4 ? "Critical" : reasons.length >= 2 ? "High" : "Medium") as "Critical" | "High" | "Medium",
      reasons,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────

function rawToScenario(data: RawAnalysis): Scenario {
  const courses = (data.courses ?? []).map((c) => ({
    name: c.name, code: c.code, credits: c.credits,
  }));

  // Credit load multiplier: 15-16 = baseline; heavy loads amplify risk
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const creditMult =
    totalCredits >= 20 ? 1.4 :
    totalCredits >= 18 ? 1.25 :
    totalCredits >= 17 ? 1.15 :
    totalCredits >= 15 ? 1.0 :
    totalCredits >= 12 ? 0.9 :
    totalCredits >  0  ? 0.8 : 1.0; // unknown load → baseline

  const total     = data.assignments.length + data.exams.length * 1.5 + data.deadlines.length * 0.5;
  const riskScore = Math.min(95, Math.max(5, Math.round(total * 5 * creditMult)));
  const riskLabel = riskScore >= 60 ? "High" : riskScore >= 35 ? "Medium" : "Low";

  const exams = data.exams.map((e) => ({
    course: e.course_code ?? courses[0]?.code ?? "Your course",
    title: e.name,
    date: e.date ?? "TBD",
    prep: "See syllabus",
    risk: (e.type === "Final" ? "high" : "medium") as RiskLevel,
    topics: e.type,
  }));

  // Build assignments first (without proximity risk), then re-score with full context
  const assignmentsRaw = data.assignments.map((a) => ({
    course: a.course_code ?? courses[0]?.code ?? "Your course",
    title: a.name,
    due: a.due_date ?? "TBD",
    risk: "medium" as RiskLevel,
    weight: a.points ?? "—",
  }));

  const assignments = assignmentsRaw.map((a) => ({
    ...a,
    risk: inferAssignmentRisk(a.title, a.weight, a.due, assignmentsRaw, exams) as RiskLevel,
  }));

  const dangerWeeks = rebuildDangerWeeks(assignments, exams);

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

  const creditNote = totalCredits >= 18 ? ` · ${totalCredits} credits (heavy load)` :
                     totalCredits >= 15 ? ` · ${totalCredits} credits` :
                     totalCredits > 0   ? ` · ${totalCredits} credits (light load)` : "";

  const riskNote =
    riskLabel === "High"   ? `${data.assignments.length} assignments + ${data.exams.length} exams detected${creditNote}. Plan early.` :
    riskLabel === "Medium" ? `${data.assignments.length} assignments + ${data.exams.length} exams detected${creditNote}. Stay on schedule.` :
                             `${data.assignments.length} assignments + ${data.exams.length} exams detected${creditNote}. Light load.`;

  return {
    id: "your-analysis",
    label: "Your Analysis",
    semester: "Your Semester",
    riskScore,
    riskLabel,
    riskNote,
    courses,
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

function recalcScenario(sc: Scenario): Scenario {
  const assignments = sc.assignments.map((a) => ({
    ...a,
    risk: inferAssignmentRisk(a.title, a.weight, a.due, sc.assignments, sc.exams) as RiskLevel,
  }));
  const dangerWeeks = rebuildDangerWeeks(assignments, sc.exams);
  return { ...sc, assignments, dangerWeeks };
}

// ── Mock scenarios ──────────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  {
    id: "high-risk",
    label: "High Risk",
    semester: "Spring 2026",
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
        week: "Mar 21 – Mar 28",
        load: "Critical",
        reasons: ["CS 301 Binary Trees due Mar 21", "MATH 202 Problem Set due Mar 22", "Calculus II midterm Mar 26", "CS 301 midterm Mar 27", "Physics lab report Mar 26"],
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
    semester: "Fall 2025",
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
  const [editingDate, setEditingDate] = useState<{ idx: number; value: string } | null>(null);
  const [showAddForm,   setShowAddForm]   = useState(false);
  const [newItem,       setNewItem]       = useState({ title: "", due: "", course: "", weight: "" });
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourse,     setNewCourse]     = useState({ name: "", code: "", credits: "" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("gr:analysis");
      if (!raw) return;
      const real = rawToScenario(JSON.parse(raw) as RawAnalysis);

      // Restore saved date edits
      const dateEdits: Record<string, Record<string, string>> =
        JSON.parse(localStorage.getItem("gr:date-edits") || "{}");
      if (dateEdits["your-analysis"]) {
        real.assignments = real.assignments.map((a) => ({
          ...a,
          due: dateEdits["your-analysis"][a.title] ?? a.due,
        }));
      }

      // Restore manually added assignments
      const manuals: Record<string, typeof real.assignments> =
        JSON.parse(localStorage.getItem("gr:manual-assignments") || "{}");
      if (manuals["your-analysis"]?.length) {
        real.assignments = [...real.assignments, ...manuals["your-analysis"]];
      }

      // Restore manually added courses
      const manualCourses: Record<string, typeof real.courses> =
        JSON.parse(localStorage.getItem("gr:manual-courses") || "{}");
      if (manualCourses["your-analysis"]?.length) {
        real.courses = [...real.courses, ...manualCourses["your-analysis"]];
      }

      setScenarios([real, ...SCENARIOS]);
      setActiveId("your-analysis");
    } catch {
      // corrupt data — fall back to mock scenarios silently
    }
  }, []);

  // Reset edit state when switching tabs
  useEffect(() => {
    setEditingDate(null);
    setShowAddForm(false);
    setNewItem({ title: "", due: "", course: "", weight: "" });
  }, [activeId]);

  function saveDate(idx: number, value: string) {
    const trimmed = value.trim() || "TBD";
    const title = s.assignments[idx].title;
    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id !== activeId) return sc;
        const assignments = sc.assignments.map((a, i) =>
          i === idx ? { ...a, due: trimmed } : a
        );
        // Re-score risks and danger weeks now that a date changed
        return recalcScenario({ ...sc, assignments });
      })
    );
    try {
      const stored: Record<string, Record<string, string>> =
        JSON.parse(localStorage.getItem("gr:date-edits") || "{}");
      stored[activeId] = { ...(stored[activeId] ?? {}), [title]: trimmed };
      localStorage.setItem("gr:date-edits", JSON.stringify(stored));
    } catch { /* ignore */ }
    setEditingDate(null);
  }

  function addAssignment() {
    if (!newItem.title.trim()) return;
    const base: Scenario["assignments"][number] = {
      course:  newItem.course.trim()  || "Your course",
      title:   newItem.title.trim(),
      due:     newItem.due.trim()     || "TBD",
      risk:    "medium",
      weight:  newItem.weight.trim()  || "—",
    };
    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id !== activeId) return sc;
        // Re-score the whole scenario including the new item
        return recalcScenario({ ...sc, assignments: [...sc.assignments, base] });
      })
    );
    try {
      const stored: Record<string, typeof base[]> =
        JSON.parse(localStorage.getItem("gr:manual-assignments") || "{}");
      stored[activeId] = [...(stored[activeId] ?? []), base];
      localStorage.setItem("gr:manual-assignments", JSON.stringify(stored));
    } catch { /* ignore */ }
    setNewItem({ title: "", due: "", course: "", weight: "" });
    setShowAddForm(false);
  }

  function addCourse() {
    if (!newCourse.name.trim() && !newCourse.code.trim()) return;
    const course = {
      name:    newCourse.name.trim()    || newCourse.code.trim(),
      code:    newCourse.code.trim()    || "???",
      credits: parseInt(newCourse.credits) || 3,
    };
    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id !== activeId) return sc;
        const courses = [...sc.courses, course];
        const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
        const creditMult =
          totalCredits >= 20 ? 1.4 : totalCredits >= 18 ? 1.25 :
          totalCredits >= 17 ? 1.15 : totalCredits >= 15 ? 1.0 :
          totalCredits >= 12 ? 0.9 : 0.8;
        const workload = sc.assignments.length + sc.exams.length * 1.5;
        const riskScore = Math.min(95, Math.max(5, Math.round(workload * 5 * creditMult)));
        return { ...sc, courses, riskScore };
      })
    );
    try {
      const stored: Record<string, typeof course[]> =
        JSON.parse(localStorage.getItem("gr:manual-courses") || "{}");
      stored[activeId] = [...(stored[activeId] ?? []), course];
      localStorage.setItem("gr:manual-courses", JSON.stringify(stored));
    } catch { /* ignore */ }
    setNewCourse({ name: "", code: "", credits: "" });
    setShowAddCourse(false);
  }

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

            {s.courses.length === 0 ? (
              <p className="mb-3 text-xs text-red-400/70 dark:text-slate-500">
                No courses detected — add them manually below.
              </p>
            ) : (
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
            )}

            {/* Add course form */}
            {showAddCourse ? (
              <div className="mt-3 border-t border-red-50 pt-3 dark:border-slate-700/60">
                <p className="mb-2 text-xs font-semibold text-red-500 dark:text-slate-400">New course</p>
                <div className="grid gap-2">
                  <input
                    placeholder="Course name (e.g. Biology of Plants)"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse((p) => ({ ...p, name: e.target.value }))}
                    className="rounded-lg border border-red-100 bg-white px-3 py-1.5 text-sm text-red-900 placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-indigo-500"
                  />
                  <div className="flex gap-2">
                    <input
                      placeholder="Code (e.g. BIOL 1040)"
                      value={newCourse.code}
                      onChange={(e) => setNewCourse((p) => ({ ...p, code: e.target.value }))}
                      className="flex-1 rounded-lg border border-red-100 bg-white px-3 py-1.5 text-sm text-red-900 placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-indigo-500"
                    />
                    <input
                      type="number"
                      min="1"
                      max="21"
                      placeholder="Credits"
                      value={newCourse.credits}
                      onChange={(e) => setNewCourse((p) => ({ ...p, credits: e.target.value }))}
                      className="w-24 rounded-lg border border-red-100 bg-white px-3 py-1.5 text-sm text-red-900 placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={addCourse}
                    disabled={!newCourse.name.trim() && !newCourse.code.trim()}
                    className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-40 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddCourse(false); setNewCourse({ name: "", code: "", credits: "" }); }}
                    className="rounded-lg bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddCourse(true)}
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-400 transition hover:text-red-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                <span className="text-base leading-none">+</span> Add course
              </button>
            )}

            {/* Credit load summary */}
            {s.courses.length > 0 && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-red-50 px-4 py-2.5 dark:bg-slate-700/40">
                <p className="text-xs text-red-600 dark:text-slate-400">Total credit load</p>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-900 dark:text-white">
                    {s.courses.reduce((sum, c) => sum + c.credits, 0)} credits
                  </p>
                  <p className="text-[10px] text-red-400 dark:text-slate-500">
                    {s.courses.reduce((sum, c) => sum + c.credits, 0) >= 18
                      ? "Heavy load · risk amplified"
                      : s.courses.reduce((sum, c) => sum + c.credits, 0) >= 15
                      ? "Recommended range"
                      : "Light load"}
                  </p>
                </div>
              </div>
            )}
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
                {s.assignments.map((a, i) => (
                  <li key={`${a.title}-${i}`} className="flex items-start justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-red-900 dark:text-slate-100">{a.title}</p>
                      <p className="mt-0.5 text-xs text-red-400 dark:text-slate-500">
                        {a.course} · Due{" "}
                        {editingDate?.idx === i ? (
                          <input
                            autoFocus
                            className="w-24 rounded border border-red-300 bg-white px-1 py-0.5 text-xs text-red-900 focus:outline-none dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
                            value={editingDate.value}
                            onChange={(e) => setEditingDate({ idx: i, value: e.target.value })}
                            onBlur={() => saveDate(i, editingDate.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveDate(i, editingDate.value);
                              if (e.key === "Escape") setEditingDate(null);
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingDate({ idx: i, value: a.due })}
                            title="Click to edit date"
                            className={`underline underline-offset-2 decoration-dashed transition hover:text-red-600 dark:hover:text-indigo-400 ${
                              a.due === "TBD" ? "text-amber-500 dark:text-amber-400" : ""
                            }`}
                          >
                            {a.due}
                          </button>
                        )}
                        {" "}· {a.weight}
                      </p>
                    </div>
                    <RiskBadge level={a.risk} />
                  </li>
                ))}
              </ul>

              {/* Add assignment form / button */}
              {showAddForm ? (
                <div className="border-t border-red-50 px-5 py-4 dark:border-slate-700/60">
                  <p className="mb-3 text-xs font-semibold text-red-500 dark:text-slate-400">New assignment</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { key: "title",  placeholder: "Title *",                   cls: "sm:col-span-2" },
                      { key: "due",    placeholder: "Due date (e.g. Apr 5) or leave blank for TBD" },
                      { key: "course", placeholder: "Course (optional)" },
                      { key: "weight", placeholder: "Weight (e.g. 10%)" },
                    ].map(({ key, placeholder, cls }) => (
                      <input
                        key={key}
                        placeholder={placeholder}
                        value={newItem[key as keyof typeof newItem]}
                        onChange={(e) => setNewItem((p) => ({ ...p, [key]: e.target.value }))}
                        className={`rounded-lg border border-red-100 bg-white px-3 py-1.5 text-sm text-red-900 placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-indigo-500 ${cls ?? ""}`}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={addAssignment}
                      disabled={!newItem.title.trim()}
                      className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-40 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddForm(false); setNewItem({ title: "", due: "", course: "", weight: "" }); }}
                      className="rounded-lg bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-red-50 px-5 py-3 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-1.5 text-xs font-medium text-red-400 transition hover:text-red-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    <span className="text-base leading-none">+</span> Add assignment
                  </button>
                </div>
              )}
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
