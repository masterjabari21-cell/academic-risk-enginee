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
  dangerWeeks: { week: string; load: WeekLoad; summary?: string; reasons: string[]; actions?: string[] }[];
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
  // ── Scenario 1: Heavy Load ────────────────────────────────────────────────
  // Spring 2026 · 18 credits · CS/Engineering student
  // Key pressure points: two project deadlines before spring break, three finals on consecutive days
  {
    id: "heavy-load",
    label: "Heavy Load",
    semester: "Spring 2026",
    riskScore: 76,
    riskLabel: "High",
    riskNote: "Your workload spikes hard around Mar 2 – Mar 6 with 3 items due — 3 weeks hit heavy and 8 exams add real pressure, amplified by an 18-credit load.",
    scoreReasons: [
      "18 credits amplifies every risk component by 1.35×",
      "3 finals land on consecutive days: May 5, 6, and 7",
      "Mar 2–6 peaks with 2 assignments + a midterm within 48 hrs",
      "CS 3510 projects total 50% of that course grade",
    ],
    courses: [
      { name: "Algorithms & Complexity",  code: "CS 3510",   credits: 3 },
      { name: "Differential Equations",   code: "MATH 2420", credits: 4 },
      { name: "Physics II: E&M",          code: "PHYS 2211", credits: 4 },
      { name: "Technical Writing",        code: "ENG 3050",  credits: 3 },
      { name: "Principles of Chemistry",  code: "CHEM 1310", credits: 4 },
    ],
    dangerWeeks: [
      {
        week: "Mar 2 – Mar 6",
        load: "Critical",
        summary: "2 assignments due with a PHYS midterm two days later — no breathing room.",
        reasons: [
          "MATH 2420 Problem Set 5 due Mar 6",
          "CHEM 1310 Titration Lab Report due Mar 6",
          "PHYS 2211 Midterm I is 2 days away on Mar 4 — no buffer",
        ],
        actions: [
          "Finish both due assignments by Mar 4 so Wed–Thu is pure PHYS review",
          "Go to PHYS office hours Mon or Tue — electric potential questions are common exam stumpers",
        ],
      },
      {
        week: "Apr 7 – Apr 11",
        load: "Critical",
        summary: "MATH Midterm II is your hardest exam of the semester, and two other deadlines are closing in.",
        reasons: [
          "MATH 2420 Midterm II on Apr 8 — hardest material of the semester",
          "CS 3510 Dynamic Programming Project (20%) due Apr 17 — prep week begins now",
          "PHYS 2211 Lab Report: Magnetic Fields due Apr 3 — grading turnaround overlaps",
        ],
        actions: [
          "Block Mon–Tue entirely for MATH Midterm II review — series solutions need full attention",
          "Stub out the CS DP project structure this week so you aren't starting cold Apr 11",
        ],
      },
      {
        week: "May 4 – May 8",
        load: "Critical",
        summary: "Finals crunch — 3 exams on consecutive days across your three hardest courses.",
        reasons: [
          "PHYS 2211 Final on May 5 — cumulative, includes optics and E&M",
          "MATH 2420 Final on May 6 — comprehensive ODE exam",
          "CS 3510 Final on May 7 — algorithms and complexity analysis",
        ],
        actions: [
          "Three finals on consecutive days — build a topic-by-topic review calendar starting Apr 21",
          "ENG 3050 Final Report (due May 1) must be fully submitted before finals week starts",
        ],
      },
    ],
    assignments: [
      { course: "CS 3510",   title: "Sorting Algorithms Implementation", due: "Feb 20", risk: "medium", weight: "12%" },
      { course: "PHYS 2211", title: "Lab Report: Coulomb's Law",         due: "Feb 27", risk: "medium", weight: "8%"  },
      { course: "MATH 2420", title: "Problem Set 5",                     due: "Mar 6",  risk: "medium", weight: "6%"  },
      { course: "CHEM 1310", title: "Lab Report: Acid-Base Titration",   due: "Mar 6",  risk: "medium", weight: "8%"  },
      { course: "CS 3510",   title: "Graph Traversal Project",           due: "Mar 20", risk: "high",   weight: "18%" },
      { course: "ENG 3050",  title: "Technical Report — First Draft",    due: "Mar 27", risk: "medium", weight: "15%" },
      { course: "PHYS 2211", title: "Lab Report: Magnetic Fields",       due: "Apr 3",  risk: "low",    weight: "8%"  },
      { course: "CS 3510",   title: "Dynamic Programming Project",       due: "Apr 17", risk: "high",   weight: "20%" },
      { course: "MATH 2420", title: "Problem Set 9",                     due: "Apr 24", risk: "low",    weight: "6%"  },
      { course: "ENG 3050",  title: "Final Technical Report",            due: "May 1",  risk: "high",   weight: "30%" },
    ],
    exams: [
      { course: "MATH 2420", title: "Midterm I",  date: "Feb 25", prep: "4 days", risk: "high",   topics: "First-order ODEs, Laplace transforms, initial value problems" },
      { course: "PHYS 2211", title: "Midterm I",  date: "Mar 4",  prep: "3 days", risk: "high",   topics: "Electrostatics, Gauss's Law, electric potential"              },
      { course: "CS 3510",   title: "Midterm",    date: "Mar 11", prep: "4 days", risk: "medium", topics: "Divide & conquer, greedy algorithms, dynamic programming intro" },
      { course: "CHEM 1310", title: "Midterm",    date: "Mar 25", prep: "5 days", risk: "medium", topics: "Thermodynamics, chemical kinetics, equilibrium"               },
      { course: "MATH 2420", title: "Midterm II", date: "Apr 8",  prep: "5 days", risk: "high",   topics: "Series solutions, systems of ODEs, phase plane analysis"      },
      { course: "PHYS 2211", title: "Final",      date: "May 5",  prep: "7 days", risk: "high",   topics: "Full semester: E&M, circuits, magnetism, optics"             },
      { course: "MATH 2420", title: "Final",      date: "May 6",  prep: "7 days", risk: "high",   topics: "Comprehensive — all ODE types and applications"              },
      { course: "CS 3510",   title: "Final",      date: "May 7",  prep: "5 days", risk: "medium", topics: "Algorithm design, complexity, NP-completeness"               },
    ],
    actions: [
      { priority: 1, label: "CS 3510 Graph Traversal Project (18%) is due Mar 20 — start coding by Mar 9 so spring break doesn't eat your runway", tag: "Schedule conflict" },
      { priority: 2, label: "Mar 2–6 has 2 assignments due with PHYS Midterm I two days later — clear MATH PS5 by Mar 3 and CHEM lab by Mar 4",    tag: "Front-load"        },
      { priority: 3, label: "May 5–7 is three finals back-to-back — build a study-by-subject calendar starting the week of Apr 20",               tag: "Study plan"        },
      { priority: 4, label: "ENG Final Report (30%) is due May 1 — rough outline it now before Apr midterm season shuts down any free time",       tag: "Get ahead"         },
      { priority: 5, label: "Spring break (Mar 16–20): no deadlines — use it to draft the ENG report and start CHEM Midterm review",              tag: "Get ahead"         },
    ],
  },

  // ── Scenario 2: Steady Pace ───────────────────────────────────────────────
  // Fall 2025 · 15 credits · Business/Social Science student
  // Key pattern: midterm month (Oct 8–29) with 4 exams in 3 weeks, manageable if spread out
  {
    id: "steady-pace",
    label: "Steady Pace",
    semester: "Fall 2025",
    riskScore: 47,
    riskLabel: "Medium",
    riskNote: "Workload is manageable but Oct 13 – Oct 17 is your crunch point with 3 items — 4 exams keep the stakes real, with a standard 15-credit load.",
    scoreReasons: [
      "4 midterms cluster Oct 8–29 — your busiest stretch",
      "ACCT Midterm and Financial Statement Analysis (20%) fall the same week",
      "Dec 9–11: ECON, ACCT, and STAT finals on consecutive days",
      "15 credits — standard load",
    ],
    courses: [
      { name: "Macroeconomics",           code: "ECON 2105", credits: 3 },
      { name: "Organizational Behavior",  code: "MGMT 3100", credits: 3 },
      { name: "Financial Accounting",     code: "ACCT 2101", credits: 3 },
      { name: "Business Statistics",      code: "STAT 2000", credits: 3 },
      { name: "Marketing Principles",     code: "MKTG 3000", credits: 3 },
    ],
    dangerWeeks: [
      {
        week: "Oct 13 – Oct 17",
        load: "High",
        summary: "ACCT midterm and a 20% paper land in the same week — same subject, double the pressure.",
        reasons: [
          "ACCT 2101 Financial Statement Analysis (20%) due Oct 17",
          "ACCT 2101 Midterm on Oct 15 — same subject, same week",
          "ECON 2105 Midterm was Oct 8 — recovery time is minimal",
        ],
        actions: [
          "Finish the Financial Statement Analysis by Oct 13 so the two exam days are pure review",
          "ACCT midterm covers journal entries and T-accounts — do 3 full practice problems before Tuesday",
        ],
      },
      {
        week: "Oct 20 – Oct 24",
        load: "High",
        summary: "STAT lab and STAT midterm back to back, with the MGMT midterm already on the horizon.",
        reasons: [
          "STAT 2000 Midterm on Oct 22",
          "STAT 2000 Descriptive Statistics Lab due Oct 24 — same week",
          "MGMT 3100 Midterm on Oct 29 — prep starts now",
        ],
        actions: [
          "STAT lab and STAT midterm both land this week — do the lab first, it reinforces midterm concepts",
          "Start MGMT 3100 motivation theory notes this weekend — Oct 29 exam comes fast",
        ],
      },
      {
        week: "Dec 8 – Dec 12",
        load: "Critical",
        summary: "Finals crunch — ECON, ACCT, and STAT finals on three consecutive days.",
        reasons: [
          "ECON 2105 Final on Dec 9 — monetary policy and trade included",
          "ACCT 2101 Final on Dec 10 — most comprehensive exam of the semester",
          "STAT 2000 Final on Dec 11 — hypothesis testing and regression",
        ],
        actions: [
          "Three finals in three days — build one-page review sheets for each subject before Dec 1",
          "ACCT final is the hardest; give it two full study sessions in the final week",
        ],
      },
    ],
    assignments: [
      { course: "ECON 2105", title: "Demand & Elasticity Case Study",    due: "Sep 26", risk: "low",    weight: "10%" },
      { course: "MGMT 3100", title: "Team Dynamics Reflection Paper",    due: "Oct 3",  risk: "low",    weight: "12%" },
      { course: "ACCT 2101", title: "Financial Statement Analysis",      due: "Oct 17", risk: "high",   weight: "20%" },
      { course: "STAT 2000", title: "Descriptive Statistics Lab",        due: "Oct 24", risk: "low",    weight: "8%"  },
      { course: "MKTG 3000", title: "Brand Audit Presentation",          due: "Nov 7",  risk: "medium", weight: "18%" },
      { course: "MGMT 3100", title: "Leadership Case Study",             due: "Nov 14", risk: "medium", weight: "15%" },
      { course: "STAT 2000", title: "Regression Analysis Project",       due: "Nov 21", risk: "medium", weight: "20%" },
      { course: "ECON 2105", title: "Monetary Policy Analysis Paper",    due: "Dec 5",  risk: "medium", weight: "20%" },
    ],
    exams: [
      { course: "ECON 2105", title: "Midterm",      date: "Oct 8",  prep: "4 days", risk: "medium", topics: "Supply & demand, elasticity, consumer theory"           },
      { course: "ACCT 2101", title: "Midterm",      date: "Oct 15", prep: "4 days", risk: "high",   topics: "Journal entries, T-accounts, income statements"         },
      { course: "STAT 2000", title: "Midterm",      date: "Oct 22", prep: "4 days", risk: "medium", topics: "Probability, normal distributions, sampling distributions"},
      { course: "MGMT 3100", title: "Midterm",      date: "Oct 29", prep: "5 days", risk: "low",    topics: "Motivation theories, group dynamics, leadership styles"  },
      { course: "ECON 2105", title: "Final",        date: "Dec 9",  prep: "6 days", risk: "medium", topics: "Monetary & fiscal policy, international trade"           },
      { course: "ACCT 2101", title: "Final",        date: "Dec 10", prep: "7 days", risk: "high",   topics: "Adjusting entries, financial ratios, full semester review"},
      { course: "STAT 2000", title: "Final",        date: "Dec 11", prep: "5 days", risk: "medium", topics: "Hypothesis testing, regression analysis, ANOVA"          },
    ],
    actions: [
      { priority: 1, label: "ACCT Financial Statement Analysis (20%) is due the same week as ACCT Midterm — finish the paper by Oct 13 so exam prep is uninterrupted",     tag: "Finish early" },
      { priority: 2, label: "4 midterms across Oct 8–29 — don't cram all four; dedicate a 2-hour block per exam starting this weekend",                                    tag: "Study plan"   },
      { priority: 3, label: "MKTG Brand Audit (18%) is due Nov 7 — pick your brand and start data collection 2 weeks early before midterm recovery eats your time",       tag: "Get ahead"    },
      { priority: 4, label: "STAT Regression Project (20%) and MGMT Case Study both land Nov 14–21 — get the STAT data cleaned before the MGMT case demands your focus",  tag: "Front-load"   },
      { priority: 5, label: "Dec 9–11: ECON, ACCT, and STAT finals back-to-back — one-page review sheets per subject, ready before Dec 1",                                tag: "Study plan"   },
    ],
  },

  // ── Scenario 3: Light Semester ────────────────────────────────────────────
  // Summer 2026 · 9 credits · Humanities electives
  // Key pattern: mostly smooth with one real crunch — finals week (Aug 4–6)
  {
    id: "light-semester",
    label: "Light Semester",
    semester: "Summer 2026",
    riskScore: 22,
    riskLabel: "Low",
    riskNote: "Spread out well — Jun 9 – Jun 13 is your busiest stretch at 2 items, and with only 5 exams you have room to breathe, softened by a lighter 9-credit load.",
    scoreReasons: [
      "9 credits — lighter than a typical semester",
      "Only 1 truly heavy week: finals (Aug 4–6)",
      "Assignments are evenly spaced with no collision windows",
      "HIST Civil Rights Paper (30%) is the single highest-stakes item",
    ],
    courses: [
      { name: "US History Since 1865",   code: "HIST 2112", credits: 3 },
      { name: "American Literature",     code: "ENGL 2130", credits: 3 },
      { name: "Introduction to Sociology", code: "SOCY 1101", credits: 3 },
    ],
    dangerWeeks: [
      {
        week: "Jun 9 – Jun 13",
        load: "Medium",
        summary: "HIST midterm Monday, then a close reading paper due Thursday — tight but manageable.",
        reasons: [
          "HIST 2112 Midterm on Jun 9 — covers Reconstruction through WWI",
          "ENGL 2130 Close Reading Analysis due Jun 12 — 3 days after the midterm",
        ],
        actions: [
          "Close Reading is due Jun 12 — draft the thesis before the HIST midterm so you only need to expand it afterward",
          "HIST Midterm: focus on the Gilded Age and Progressive Era — these appear on almost every section exam",
        ],
      },
      {
        week: "Jul 14 – Jul 18",
        load: "Medium",
        summary: "The Civil Rights Paper is 30% of your HIST grade — this week is low-volume but high-stakes.",
        reasons: [
          "HIST 2112 Civil Rights Research Paper (30%) due Jul 17",
          "No other major deadlines — but this is 30% of the course grade",
        ],
        actions: [
          "Civil Rights Paper (30%) — have your argument and 3 sources locked in by Jul 7 so Jul 14 is drafting, not researching",
        ],
      },
      {
        week: "Aug 3 – Aug 7",
        load: "High",
        summary: "Three finals in three days — the only real crunch point of the entire summer semester.",
        reasons: [
          "ENGL 2130 Final on Aug 4 — Fitzgerald, Hemingway, Morrison",
          "HIST 2112 Final on Aug 5 — WWII through present day",
          "SOCY 1101 Final on Aug 6 — research methods and social institutions",
        ],
        actions: [
          "Three finals in three days — this is the only real crunch all summer; start subject reviews Jul 28",
          "ENGL Final covers close reading: re-read your Close Reading Analysis for technique before Aug 4",
        ],
      },
    ],
    assignments: [
      { course: "HIST 2112", title: "Reconstruction Era Response Paper",  due: "Jun 5",  risk: "low",    weight: "15%" },
      { course: "ENGL 2130", title: "Close Reading: The Great Gatsby",    due: "Jun 12", risk: "low",    weight: "15%" },
      { course: "SOCY 1101", title: "Field Observation Report",           due: "Jun 26", risk: "low",    weight: "20%" },
      { course: "HIST 2112", title: "Civil Rights Movement Research Paper", due: "Jul 17", risk: "medium", weight: "30%" },
      { course: "ENGL 2130", title: "Comparative Essay: Modernism",       due: "Jul 24", risk: "medium", weight: "25%" },
    ],
    exams: [
      { course: "HIST 2112", title: "Midterm",      date: "Jun 9",  prep: "3 days", risk: "low",    topics: "Reconstruction, Gilded Age, Progressivism, WWI"          },
      { course: "SOCY 1101", title: "Midterm",      date: "Jun 16", prep: "3 days", risk: "low",    topics: "Socialization, stratification, deviance, social control"  },
      { course: "ENGL 2130", title: "Final",        date: "Aug 4",  prep: "5 days", risk: "low",    topics: "Fitzgerald, Hemingway, Morrison — themes and close reading"},
      { course: "HIST 2112", title: "Final",        date: "Aug 5",  prep: "5 days", risk: "medium", topics: "WWII, Cold War, Civil Rights, post-1980 America"          },
      { course: "SOCY 1101", title: "Final",        date: "Aug 6",  prep: "4 days", risk: "low",    topics: "Research methods, social institutions, inequality"        },
    ],
    actions: [
      { priority: 1, label: "HIST Civil Rights Research Paper is 30% of the grade — lock in your argument and 3 primary sources by Jul 7 so you're only drafting during Jul 14 week", tag: "High value"  },
      { priority: 2, label: "Three finals Aug 4–6 are the only real crunch all summer — start subject reviews Jul 28 and do one mock essay per course",                               tag: "Study plan"  },
      { priority: 3, label: "ENGL Comparative Essay (25%) is due Jul 24 — budget 2 drafting sessions the week of Jul 14 while HIST paper ideas are still fresh",                     tag: "Front-load"  },
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

// ── Stats Bar ──────────────────────────────────────────────────────────────

function StatsBar({ scenario }: { scenario: Scenario }) {
  const totalCredits = scenario.courses.reduce((s, c) => s + c.credits, 0);
  const highRisk = [
    ...scenario.assignments.filter((a) => a.risk === "high"),
    ...scenario.exams.filter((e)  => e.risk === "high"),
  ].length;
  const stats = [
    { label: "Assignments", value: scenario.assignments.length, hot: false },
    { label: "Exams",       value: scenario.exams.length,       hot: false },
    { label: "High Risk",   value: highRisk,                    hot: highRisk > 0 },
    { label: "Credits",     value: totalCredits,                 hot: false },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((st) => (
        <div
          key={st.label}
          className={`rounded-2xl border p-4 text-center shadow-sm ${
            st.hot
              ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/15"
              : "border-red-100 bg-white dark:border-slate-700 dark:bg-slate-800/70"
          }`}
        >
          <p className="text-2xl font-bold text-red-900 dark:text-white">{st.value}</p>
          <p className={`mt-0.5 text-xs ${st.hot ? "text-red-500 dark:text-red-400" : "text-red-400/70 dark:text-slate-500"}`}>
            {st.label}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Semester Timeline ──────────────────────────────────────────────────────

function SemesterTimeline({ scenario }: { scenario: Scenario }) {
  const items: { label: string; date: Date; kind: "assignment" | "exam"; risk: RiskLevel }[] = [];

  for (const a of scenario.assignments) {
    const d = parseDate(a.due);
    if (d) items.push({ label: a.title, date: d, kind: "assignment", risk: a.risk });
  }
  for (const e of scenario.exams) {
    const d = parseDate(e.date);
    if (d) items.push({ label: `${e.course} ${e.title}`, date: d, kind: "exam", risk: e.risk });
  }

  if (items.length === 0) return null;

  const timestamps = items.map((i) => i.date.getTime());
  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  const pad   = Math.max((maxTs - minTs) * 0.04, 86400000 * 5);
  const startTs   = minTs - pad;
  const endTs     = maxTs + pad;
  const totalSpan = endTs - startTs;

  function pct(ts: number) {
    return ((ts - startTs) / totalSpan) * 100;
  }

  // Month markers
  const monthLabels: { label: string; left: number }[] = [];
  const cursor = new Date(startTs);
  cursor.setDate(1);
  while (cursor.getTime() <= endTs) {
    const p = pct(cursor.getTime());
    if (p >= 0 && p <= 100)
      monthLabels.push({ label: cursor.toLocaleString("default", { month: "short" }), left: p });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Danger week bands
  const bands: { startPct: number; endPct: number; load: WeekLoad }[] = [];
  for (const w of scenario.dangerWeeks) {
    const parts = w.week.split("–").map((p) => p.trim());
    if (parts.length === 2) {
      const s = parseDate(parts[0]);
      const e = parseDate(parts[1]);
      if (s && e) {
        bands.push({
          startPct: Math.max(0, pct(s.getTime())),
          endPct:   Math.min(100, pct(e.getTime())),
          load:     w.load,
        });
      }
    }
  }

  const BAND_BG: Record<WeekLoad, string> = {
    Critical: "bg-red-100/80 dark:bg-red-900/20",
    High:     "bg-amber-100/80 dark:bg-amber-900/20",
    Medium:   "bg-blue-100/80 dark:bg-blue-900/20",
  };

  const DOT_COLOR: Record<RiskLevel, string> = {
    high:   "bg-red-500   border-red-600",
    medium: "bg-amber-400 border-amber-500",
    low:    "bg-green-400 border-green-500",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-red-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-red-500 dark:text-indigo-400">
        Semester Timeline
      </p>

      {/* Track */}
      <div className="relative h-14 w-full select-none">
        {/* Danger week bands */}
        {bands.map((b, i) => (
          <div
            key={i}
            className={`absolute top-0 h-full ${BAND_BG[b.load]}`}
            style={{ left: `${b.startPct}%`, width: `${b.endPct - b.startPct}%` }}
          />
        ))}

        {/* Baseline */}
        <div className="absolute top-1/2 h-px w-full bg-red-100 dark:bg-slate-700" />

        {/* Dots */}
        {items.map((item, i) => {
          const x    = pct(item.date.getTime());
          const isEx = item.kind === "exam";
          const size = isEx ? 12 : 10;
          return (
            <div
              key={i}
              title={`${item.label}\n${item.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
              className={`absolute border transition-transform hover:scale-[1.5] hover:z-10 ${DOT_COLOR[item.risk]} ${
                isEx ? "rounded-sm rotate-45" : "rounded-full"
              }`}
              style={{
                width:  size,
                height: size,
                left:  `calc(${x}% - ${size / 2}px)`,
                top:   `calc(50% - ${size / 2}px)`,
              }}
            />
          );
        })}
      </div>

      {/* Month labels */}
      <div className="relative mt-1.5 h-4">
        {monthLabels.map((m) => (
          <span
            key={`${m.label}-${m.left}`}
            className="absolute -translate-x-1/2 text-[10px] text-red-300 dark:text-slate-600"
            style={{ left: `${m.left}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-red-400/70 dark:text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> High risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" /> Medium risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400" /> Low risk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rotate-45 rounded-sm bg-slate-400 dark:bg-slate-500" /> Exam
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" /> Assignment
        </span>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>(SCENARIOS);
  const [activeId,  setActiveId]  = useState("heavy-load");
  const [editingDate, setEditingDate] = useState<{ idx: number; value: string } | null>(null);
  const [showAddForm,   setShowAddForm]   = useState(false);
  const [newItem,       setNewItem]       = useState({ title: "", due: "", course: "", weight: "" });
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourse,     setNewCourse]     = useState({ name: "", code: "", credits: "" });
  const [lastAnalyzed,  setLastAnalyzed]  = useState<string | null>(null);
  const [simGrades,     setSimGrades]     = useState<Record<string, string>>({});
  const [completing,    setCompleting]    = useState<number[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("gr:analysis");
      if (!raw) return;
      const real = rawToScenario(JSON.parse(raw) as RawAnalysis);

      // Track when this analysis was last run
      const analyzedAt = localStorage.getItem("gr:analyzed-at");
      if (analyzedAt) {
        const d = new Date(analyzedAt);
        setLastAnalyzed(
          d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
          " at " +
          d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        );
      }

      // Load GPA Sim grades for the course list
      const simGradesRaw = localStorage.getItem("gr:sim-grades");
      if (simGradesRaw) setSimGrades(JSON.parse(simGradesRaw));

      // Append to risk history (dedup by score to avoid re-saving on every mount)
      try {
        const history: { date: string; score: number; label: string }[] =
          JSON.parse(localStorage.getItem("gr:risk-history") || "[]");
        const last = history[history.length - 1];
        if (!last || last.score !== real.riskScore || last.date !== analyzedAt) {
          history.push({ date: analyzedAt ?? new Date().toISOString(), score: real.riskScore, label: real.riskLabel });
          localStorage.setItem("gr:risk-history", JSON.stringify(history.slice(-20)));
        }
      } catch { /* ignore */ }

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

  // Load GPA Sim grades on mount (works for both real and demo scenarios)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("gr:sim-grades");
      if (raw) setSimGrades(JSON.parse(raw));
    } catch { /* ignore */ }
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
        return recalcScenario({ ...sc, courses: [...sc.courses, course] });
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
        return recalcScenario({ ...sc, courses: sc.courses.filter((_, i) => i !== idx) });
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

  function markDone(idx: number) {
    setCompleting((prev) => [...prev, idx]);
    setTimeout(() => {
      removeAssignment(idx);
      setCompleting((prev) => prev.filter((i) => i !== idx));
    }, 500);
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
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-red-500 dark:text-indigo-400">
              {s.semester} · Risk Dashboard
            </p>
            {activeId === "your-analysis" && lastAnalyzed && (
              <p className="mt-0.5 text-[11px] text-red-400/60 dark:text-slate-600">
                Last analyzed: {lastAnalyzed}
              </p>
            )}
          </div>
          <Link
            href="/upload"
            className="text-xs font-medium text-red-400 underline underline-offset-2 hover:text-red-600 dark:text-slate-500 dark:hover:text-indigo-400"
          >
            ← Run new analysis
          </Link>
        </div>

        {/* Demo mode banner */}
        {activeId !== "your-analysis" && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-800/40 dark:bg-amber-950/15">
            <span className="text-sm">👀</span>
            <p className="text-xs text-amber-800 dark:text-amber-400">
              You&apos;re viewing <span className="font-semibold">sample data</span> —{" "}
              <Link href="/upload" className="underline underline-offset-2 hover:text-amber-600 dark:hover:text-amber-300">
                upload a syllabus
              </Link>{" "}
              to see your own risk score.
            </p>
          </div>
        )}

        {/* ── Scenario switcher ── */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase tracking-widest text-red-400 dark:text-slate-500">
            Sample scenarios
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
        <div className="grid gap-4 md:grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr_260px]">

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
                      {simGrades[c.code] && (
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          {simGrades[c.code]}
                        </span>
                      )}
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

                  {/* AI narrative summary */}
                  {w.summary && (
                    <p className="mt-2 text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                      {w.summary}
                    </p>
                  )}

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

        {/* ── Semester stats + Timeline ── */}
        <section className="mt-8 space-y-4">
          <StatsBar scenario={s} />
          <SemesterTimeline scenario={s} />
        </section>

        {/* ── Assignments + Exams ── */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">

          <section>
            <SectionHeading>Upcoming assignments</SectionHeading>
            <Panel>
              <ul className="divide-y divide-red-50 dark:divide-slate-700/60">
                {s.assignments.map((a, i) => (
                  <li key={`${a.title}-${i}`} className={`flex items-start justify-between gap-4 px-5 py-3.5 transition-colors duration-300 ${completing.includes(i) ? "bg-green-50 dark:bg-green-900/10" : ""}`}>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-medium text-red-900 dark:text-slate-100 transition-all duration-300 ${completing.includes(i) ? "line-through opacity-50" : ""}`}>{a.title}</p>
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
                        onClick={() => markDone(i)}
                        title="Mark as done"
                        disabled={completing.includes(i)}
                        className={`rounded-full p-1 transition ${completing.includes(i) ? "text-green-500 dark:text-green-400" : "text-red-200 hover:bg-green-100 hover:text-green-600 dark:text-slate-600 dark:hover:bg-green-900/30 dark:hover:text-green-400"}`}
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
