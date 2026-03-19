"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "../components/ui";
import { normalizeItems } from "../lib/normalize";
import { identifyDangerWeeks } from "../lib/danger-weeks";
import { computeSemesterRisk, generateRecommendations, type RiskItem } from "../lib/semester-risk";

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


// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────

function rawToScenario(data: RawAnalysis): Scenario {
  const courses = (data.courses ?? []).map((c) => ({
    name: c.name, code: c.code, credits: c.credits,
  }));

  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);

  // Normalize all syllabus items into a single clean array first,
  // then derive the typed arrays the dashboard needs from it.
  const allItems = normalizeItems(data);
  const fallbackCourse = courses[0]?.code ?? "Your course";

  const exams = allItems
    .filter((i) => i.type === "exam" || i.type === "quiz")
    .map((i) => ({
      course: i.courseCode ?? fallbackCourse,
      title:  i.title,
      date:   i.dueDate ?? "TBD",
      prep:   "See syllabus",
      risk:   (/final/i.test(i.notes ?? "") ? "high" : "medium") as RiskLevel,
      topics: i.notes ?? i.type,
    }));

  const assignmentsRaw = allItems
    .filter((i) => i.type === "assignment" || i.type === "project")
    .map((i) => ({
      course: i.courseCode ?? fallbackCourse,
      title:  i.title,
      due:    i.dueDate ?? "TBD",
      risk:   "medium" as RiskLevel,
      weight: i.weight ?? "—",
    }));

  const assignments = assignmentsRaw.map((a) => ({
    ...a,
    risk: inferAssignmentRisk(a.title, a.weight, a.due, assignmentsRaw, exams) as RiskLevel,
  }));

  const dangerWeeks = identifyDangerWeeks([
    ...assignments.map((a) => ({ title: a.title, kind: "assignment" as const, date: a.due, weight: a.weight })),
    ...exams.map((e) => ({ title: e.title, kind: "exam" as const, date: e.date })),
  ]);

  const workloadItems: RiskItem[] = allItems.map((i) => ({
    title:  i.title,
    kind:   i.type as RiskItem["kind"],
    date:   i.dueDate,
    weight: i.weight,
  }));
  const { score: riskScore, label: riskLabel, explanation: riskNote, scoreReasons } =
    computeSemesterRisk(workloadItems, totalCredits);

  const recs = generateRecommendations(workloadItems, dangerWeeks);
  const actions: Scenario["actions"] = recs.map((r, i) => ({
    priority: i + 1,
    label: r.label,
    tag: r.tag,
  }));

  return {
    id: "your-analysis",
    label: "Your Analysis",
    semester: "Your Semester",
    riskScore,
    riskLabel,
    riskNote,
    scoreReasons,
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
  scoreReasons: string[];
  courses: { name: string; code: string; credits: number }[];
  dangerWeeks: { week: string; load: WeekLoad; reasons: string[]; actions?: string[] }[];
  assignments: { course: string; title: string; due: string; risk: RiskLevel; weight: string }[];
  exams: { course: string; title: string; date: string; prep: string; risk: RiskLevel; topics: string }[];
  actions: { priority: number; label: string; tag: string }[];
}

function recalcScenario(sc: Scenario): Scenario {
  const assignments = sc.assignments.map((a) => ({
    ...a,
    risk: inferAssignmentRisk(a.title, a.weight, a.due, sc.assignments, sc.exams) as RiskLevel,
  }));
  const dangerWeeks = identifyDangerWeeks([
    ...assignments.map((a) => ({ title: a.title, kind: "assignment" as const, date: a.due, weight: a.weight })),
    ...sc.exams.map((e) => ({ title: e.title, kind: "exam" as const, date: e.date })),
  ]);
  const totalCredits = sc.courses.reduce((s, c) => s + c.credits, 0);
  const workloadItems: RiskItem[] = [
    ...assignments.map((a) => ({ title: a.title, kind: "assignment" as const, date: a.due, weight: a.weight })),
    ...sc.exams.map((e)    => ({ title: e.title, kind: "exam"       as const, date: e.date })),
  ];
  const { score: riskScore, label: riskLabel, explanation: riskNote, scoreReasons } =
    computeSemesterRisk(workloadItems, totalCredits);
  const recs = generateRecommendations(workloadItems, dangerWeeks);
  const actions: Scenario["actions"] = recs.map((r, i) => ({ priority: i + 1, label: r.label, tag: r.tag }));
  return { ...sc, assignments, dangerWeeks, riskScore, riskLabel, riskNote, scoreReasons, actions };
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
    scoreReasons: ["2 midterms in the same week (Mar 26-27)", "CS 301 project due Mar 21 starts the crunch", "17 credits amplifies your workload risk"],
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
    scoreReasons: ["2 midterms in Oct (Oct 17 and Oct 22)", "CS 401 graph project due Nov 20 is worth 18%", "11 credits is a lighter load — risk reduced"],
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
    scoreReasons: ["No finals or midterms — only quizzes and oral exams", "9 credits is a light summer load", "Assignments are spread out with no heavy clusters"],
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

  function removeCourse(idx: number) {
    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id !== activeId) return sc;
        const courses = sc.courses.filter((_, i) => i !== idx);
        const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
        const creditMult =
          totalCredits >= 20 ? 1.4 : totalCredits >= 18 ? 1.25 :
          totalCredits >= 17 ? 1.15 : totalCredits >= 15 ? 1.0 :
          totalCredits >= 12 ? 0.9 : totalCredits > 0 ? 0.8 : 1.0;
        const workload = sc.assignments.length + sc.exams.length * 1.5;
        const riskScore = Math.min(95, Math.max(5, Math.round(workload * 5 * creditMult)));
        return { ...sc, courses, riskScore };
      })
    );
    try {
      const stored: Record<string, { name: string; code: string; credits: number }[]> =
        JSON.parse(localStorage.getItem("gr:manual-courses") || "{}");
      if (stored[activeId]) {
        stored[activeId] = stored[activeId].filter((_, i) => i !== idx - (s.courses.length - (stored[activeId]?.length ?? 0)));
        localStorage.setItem("gr:manual-courses", JSON.stringify(stored));
      }
    } catch { /* ignore */ }
  }

  function removeAssignment(idx: number) {
    setScenarios((prev) =>
      prev.map((sc) => {
        if (sc.id !== activeId) return sc;
        const assignments = sc.assignments.filter((_, i) => i !== idx);
        return recalcScenario({ ...sc, assignments });
      })
    );
    try {
      const stored: Record<string, { title: string; due: string; course: string; risk: string; weight: string }[]> =
        JSON.parse(localStorage.getItem("gr:manual-assignments") || "{}");
      if (stored[activeId]) {
        stored[activeId] = stored[activeId].filter((_, i) => i !== idx - (s.assignments.length - (stored[activeId]?.length ?? 0)));
        localStorage.setItem("gr:manual-assignments", JSON.stringify(stored));
      }
    } catch { /* ignore */ }
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

        {/* ── Risk score + courses + recommended actions ── */}
        <div className="grid gap-4 lg:grid-cols-[240px_1fr_260px]">

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
            {s.scoreReasons.length > 0 && (
              <ul className="mt-3 w-full space-y-1 text-left">
                {s.scoreReasons.map((r) => (
                  <li key={r} className="flex items-start gap-1.5 text-[11px] text-red-400/70 dark:text-slate-500">
                    <span className="mt-0.5 shrink-0 text-red-300 dark:text-slate-600">›</span>
                    {r}
                  </li>
                ))}
              </ul>
            )}
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
                {s.courses.map((c, i) => (
                  <li key={`${c.code}-${i}`} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-red-900 dark:text-slate-100">{c.name}</p>
                      <p className="text-xs text-red-400 dark:text-slate-500">{c.code}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-slate-700 dark:text-slate-300">
                        {c.credits} cr
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCourse(i)}
                        title="Drop course"
                        className="rounded-full p-1 text-red-200 transition hover:bg-red-100 hover:text-red-500 dark:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
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

          {/* Recommended actions — 3rd column */}
          <Panel className="flex flex-col p-5">
            <SectionHeading>Recommended actions</SectionHeading>
            <ul className="flex flex-col gap-3">
              {s.actions.map((a) => (
                <li key={a.priority} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white dark:bg-indigo-600">
                    {a.priority}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs leading-snug text-red-800 dark:text-slate-200">{a.label}</p>
                    <span className="mt-1 inline-block rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400">
                      {a.tag}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
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

                  {/* Why this week is flagged */}
                  <ul className="mt-3 space-y-1.5">
                    {w.reasons.map((r) => (
                      <li key={r} className={`flex items-start gap-2 text-xs ${st.text}`}>
                        <span className="mt-0.5 shrink-0 opacity-40">—</span>
                        {r}
                      </li>
                    ))}
                  </ul>

                  {/* What to do about it */}
                  {w.actions && w.actions.length > 0 && (
                    <ul className="mt-3 space-y-1.5 border-t border-current/10 pt-3">
                      {w.actions.map((a) => (
                        <li key={a} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="mt-0.5 shrink-0 text-green-500">✓</span>
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
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
                    <div className="flex items-center gap-2 shrink-0">
                      <RiskBadge level={a.risk} />
                      <button
                        type="button"
                        onClick={() => removeAssignment(i)}
                        title="Mark as done"
                        className="rounded-full p-1 text-red-200 transition hover:bg-green-100 hover:text-green-600 dark:text-slate-600 dark:hover:bg-green-900/30 dark:hover:text-green-400"
                      >
                        ✓
                      </button>
                    </div>
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


      </main>
    </div>
  );
}
