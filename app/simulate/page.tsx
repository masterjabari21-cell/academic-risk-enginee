"use client";

import { useState, useEffect } from "react";
import { SiteHeader } from "../components/ui";

// ── Grade scale ────────────────────────────────────────────────────────────

const GRADE_POINTS: Record<string, number> = {
  "A+": 4.33, "A": 4.00, "A-": 3.67,
  "B+": 3.33, "B": 3.00, "B-": 2.67,
  "C+": 2.33, "C": 2.00, "C-": 1.67,
  "D+": 1.33, "D": 1.00, "D-": 0.67,
  "F":  0.00,
};

const GRADE_OPTIONS = Object.keys(GRADE_POINTS);

const GRADE_COLOR: Record<string, string> = {
  "A+": "text-emerald-600 dark:text-emerald-400",
  "A":  "text-emerald-600 dark:text-emerald-400",
  "A-": "text-emerald-500 dark:text-emerald-400",
  "B+": "text-blue-600   dark:text-blue-400",
  "B":  "text-blue-600   dark:text-blue-400",
  "B-": "text-blue-500   dark:text-blue-400",
  "C+": "text-amber-600  dark:text-amber-400",
  "C":  "text-amber-600  dark:text-amber-400",
  "C-": "text-amber-500  dark:text-amber-400",
  "D+": "text-orange-600 dark:text-orange-400",
  "D":  "text-orange-600 dark:text-orange-400",
  "D-": "text-orange-500 dark:text-orange-400",
  "F":  "text-red-600    dark:text-red-400",
};

function gpaColor(gpa: number): string {
  if (gpa >= 3.67) return "text-emerald-600 dark:text-emerald-400";
  if (gpa >= 3.00) return "text-blue-600 dark:text-blue-400";
  if (gpa >= 2.00) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function gpaLabel(gpa: number): string {
  if (gpa >= 3.67) return "Dean's List";
  if (gpa >= 3.00) return "Good Standing";
  if (gpa >= 2.00) return "Satisfactory";
  if (gpa >= 1.00) return "At Risk";
  return "Academic Probation";
}

// ── Types ──────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  name: string;
  code: string;
  credits: number;
  currentGrade: string;
  targetGrade: string;
}

let _id = 6;
function nextId() { return String(++_id); }

// ── Default courses — matches the "Heavy Load" demo scenario on the dashboard
const DEFAULT_COURSES: Course[] = [
  { id: "1", name: "Algorithms & Complexity", code: "CS 3510",   credits: 3, currentGrade: "B+", targetGrade: "A-" },
  { id: "2", name: "Differential Equations",  code: "MATH 2420", credits: 4, currentGrade: "B",  targetGrade: "B+" },
  { id: "3", name: "Physics II: E&M",         code: "PHYS 2211", credits: 4, currentGrade: "B+", targetGrade: "A-" },
  { id: "4", name: "Technical Writing",       code: "ENG 3050",  credits: 3, currentGrade: "A-", targetGrade: "A"  },
  { id: "5", name: "Principles of Chemistry", code: "CHEM 1310", credits: 4, currentGrade: "B",  targetGrade: "B+" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function calcGPA(courses: Course[], key: "currentGrade" | "targetGrade"): number {
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  if (totalCredits === 0) return 0;
  const totalPoints = courses.reduce((s, c) => s + c.credits * (GRADE_POINTS[c[key]] ?? 0), 0);
  return totalPoints / totalCredits;
}

function calcCumulativeGPA(semGPA: number, semCredits: number, priorGPA: number, priorCredits: number): number {
  const total = semCredits + priorCredits;
  if (total === 0) return 0;
  return (semGPA * semCredits + priorGPA * priorCredits) / total;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function GradeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-red-100 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-indigo-500"
    >
      {GRADE_OPTIONS.map((g) => (
        <option key={g} value={g}>{g}</option>
      ))}
    </select>
  );
}

function GPAGauge({ label, gpa, sub }: { label: string; gpa: number; sub?: string }) {
  const pct = Math.min((gpa / 4.33) * 100, 100);
  return (
    <div>
      <div className="mb-1 flex items-end justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-red-400 dark:text-slate-500">{label}</p>
        {sub && <p className="text-xs text-red-400/60 dark:text-slate-600">{sub}</p>}
      </div>
      <p className={`text-4xl font-bold tabular-nums ${gpaColor(gpa)}`}>
        {gpa.toFixed(2)}
        <span className="ml-1 text-base font-normal text-red-300 dark:text-slate-600">/ 4.33</span>
      </p>
      <p className={`mt-1 text-xs font-medium ${gpaColor(gpa)}`}>{gpaLabel(gpa)}</p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-red-100 dark:bg-slate-700">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: gpa >= 3.67 ? "#10b981" : gpa >= 3.0 ? "#3b82f6" : gpa >= 2.0 ? "#f59e0b" : "#ef4444",
          }}
        />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SimulatePage() {
  const [courses,     setCourses]     = useState<Course[]>(DEFAULT_COURSES);
  const [priorGPA,    setPriorGPA]    = useState("3.20");
  const [priorCredits,setPriorCredits]= useState("45");
  const [fromUpload,  setFromUpload]  = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("gr:analysis");
      if (!raw) return;
      const data = JSON.parse(raw) as { courses?: { name: string; code: string; credits: number }[] };
      const loaded = (data.courses ?? []).map((c, i) => ({
        id:           String(i + 1),
        name:         c.name,
        code:         c.code,
        credits:      c.credits,
        currentGrade: "B"  as const,
        targetGrade:  "B+" as const,
      }));
      if (loaded.length > 0) {
        setCourses(loaded);
        setFromUpload(true);
      }
    } catch { /* fall back to defaults */ }
  }, []);

  useEffect(() => {
    try {
      const grades: Record<string, string> = {};
      courses.forEach((c) => { if (c.code) grades[c.code] = c.currentGrade; });
      localStorage.setItem("gr:sim-grades", JSON.stringify(grades));
    } catch { /* ignore */ }
  }, [courses]);

  const semCredits = courses.reduce((s, c) => s + c.credits, 0);
  const currentGPA = calcGPA(courses, "currentGrade");
  const targetGPA  = calcGPA(courses, "targetGrade");

  const priorGPANum     = parseFloat(priorGPA)     || 0;
  const priorCreditsNum = parseFloat(priorCredits) || 0;

  const currentCumulative = calcCumulativeGPA(currentGPA, semCredits, priorGPANum, priorCreditsNum);
  const targetCumulative  = calcCumulativeGPA(targetGPA,  semCredits, priorGPANum, priorCreditsNum);
  const gpaImpact         = targetGPA - currentGPA;

  function updateCourse(id: string, field: keyof Course, value: string | number) {
    setCourses((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  }

  function addCourse() {
    setCourses((prev) => [...prev, {
      id: nextId(),
      name: "New Course",
      code: "",
      credits: 3,
      currentGrade: "B",
      targetGrade: "B",
    }]);
  }

  function removeCourse(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="min-h-screen bg-[#fdf4e7] text-red-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-10 pb-20 sm:px-6 lg:px-8">

        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-red-500 dark:text-indigo-400">
          GPA Simulator
        </p>

        {/* Sync banner */}
        {fromUpload ? (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 dark:border-green-800/40 dark:bg-green-950/15">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">✓</span>
            <p className="text-xs text-green-800 dark:text-green-400">
              Courses synced from your uploaded syllabus — set your current grades below.
            </p>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-800/40 dark:bg-amber-950/15">
            <span className="text-sm">👀</span>
            <p className="text-xs text-amber-800 dark:text-amber-400">
              Showing sample courses —{" "}
              <a href="/upload" className="underline underline-offset-2 hover:text-amber-600 dark:hover:text-amber-300">
                upload a syllabus
              </a>{" "}
              to sync your real course list automatically.
            </p>
          </div>
        )}

        {/* ── GPA summary cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="col-span-2 rounded-2xl border border-red-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <GPAGauge label="Current semester GPA" gpa={currentGPA} sub={`${semCredits} credits`} />
          </div>

          <div className="col-span-2 rounded-2xl border border-red-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <GPAGauge label="Projected semester GPA" gpa={targetGPA} sub="if targets are hit" />
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-400 dark:text-slate-500">GPA Impact</p>
            <p className={`mt-2 text-3xl font-bold tabular-nums ${gpaImpact >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {gpaImpact >= 0 ? "+" : ""}{gpaImpact.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-red-400/60 dark:text-slate-600">semester change</p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-400 dark:text-slate-500">Cumulative (now)</p>
            <p className={`mt-2 text-3xl font-bold tabular-nums ${gpaColor(currentCumulative)}`}>{currentCumulative.toFixed(2)}</p>
            <p className="mt-1 text-xs text-red-400/60 dark:text-slate-600">{(semCredits + priorCreditsNum)} total credits</p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-400 dark:text-slate-500">Cumulative (target)</p>
            <p className={`mt-2 text-3xl font-bold tabular-nums ${gpaColor(targetCumulative)}`}>{targetCumulative.toFixed(2)}</p>
            <p className={`mt-1 text-xs font-medium ${gpaColor(targetCumulative)}`}>{gpaLabel(targetCumulative)}</p>
          </div>

          {/* Prior credits input */}
          <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/50 p-5 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-400 dark:text-slate-500">Prior History</p>
            <p className="mt-1 text-[11px] leading-relaxed text-red-400/70 dark:text-slate-500">
              Enter your GPA and credits before this semester so your cumulative GPA projection is accurate.
            </p>
            <div className="mt-3 space-y-2">
              <div>
                <label className="text-xs text-red-500 dark:text-slate-500">Cumulative GPA</label>
                <input
                  type="number" min="0" max="4.33" step="0.01"
                  value={priorGPA}
                  onChange={(e) => setPriorGPA(e.target.value)}
                  onBlur={(e) => {
                    const n = parseFloat(e.target.value);
                    setPriorGPA(isNaN(n) ? "0.00" : Math.min(4.33, Math.max(0, n)).toFixed(2));
                  }}
                  className="mt-1 w-full rounded-lg border border-red-100 bg-white px-2.5 py-1.5 text-sm text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-red-500 dark:text-slate-500">Credits earned</label>
                <input
                  type="number" min="0" step="1"
                  value={priorCredits}
                  onChange={(e) => setPriorCredits(e.target.value)}
                  onBlur={(e) => {
                    const n = parseInt(e.target.value);
                    setPriorCredits(isNaN(n) ? "0" : String(Math.max(0, n)));
                  }}
                  className="mt-1 w-full rounded-lg border border-red-100 bg-white px-2.5 py-1.5 text-sm text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

        </div>

        {/* ── Course table ── */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-500 dark:text-indigo-400">
              Courses
            </p>
            <button
              type="button"
              onClick={addCourse}
              className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              + Add course
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-red-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">

            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 border-b border-red-50 px-5 py-2.5 dark:border-slate-700">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-400 dark:text-slate-500">Course</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-400 dark:text-slate-500">Credits</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-400 dark:text-slate-500">Current grade</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-400 dark:text-slate-500">Pts</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-400 dark:text-slate-500">Target grade</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-400 dark:text-slate-500">Pts</p>
            </div>

            {/* Course rows */}
            <ul className="divide-y divide-red-50 dark:divide-slate-700">
              {courses.map((course) => {
                const currentPts = GRADE_POINTS[course.currentGrade] ?? 0;
                const targetPts  = GRADE_POINTS[course.targetGrade]  ?? 0;
                const diff       = targetPts - currentPts;
                return (
                  <li key={course.id} className="relative group grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 px-5 py-3">

                    {/* Name + code */}
                    <div className="min-w-0">
                      <input
                        type="text"
                        value={course.name}
                        onChange={(e) => updateCourse(course.id, "name", e.target.value)}
                        placeholder="Course name"
                        className="w-full rounded border border-transparent bg-white px-1 text-sm font-medium text-red-900 hover:border-red-100 focus:border-red-300 focus:outline-none dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-slate-500"
                      />
                      <input
                        type="text"
                        value={course.code}
                        onChange={(e) => updateCourse(course.id, "code", e.target.value)}
                        placeholder="Course code"
                        className="mt-0.5 w-full rounded border border-transparent bg-white px-1 text-xs text-red-400 placeholder:text-red-200 hover:border-red-100 focus:border-red-300 focus:outline-none dark:bg-slate-800 dark:text-slate-500 dark:placeholder:text-slate-700 dark:hover:border-slate-600 dark:focus:border-slate-500"
                      />
                    </div>

                    {/* Credits */}
                    <input
                      type="number"
                      min="0.5"
                      max="6"
                      step="0.5"
                      value={course.credits}
                      onChange={(e) => updateCourse(course.id, "credits", parseFloat(e.target.value) || 0)}
                      className="w-14 rounded-lg border border-red-100 bg-white px-2 py-1 text-center text-sm text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-indigo-500"
                    />

                    {/* Current grade */}
                    <GradeSelect
                      value={course.currentGrade}
                      onChange={(v) => updateCourse(course.id, "currentGrade", v)}
                    />

                    {/* Current pts */}
                    <span className={`w-10 text-center text-sm font-semibold tabular-nums ${GRADE_COLOR[course.currentGrade]}`}>
                      {currentPts.toFixed(2)}
                    </span>

                    {/* Target grade */}
                    <GradeSelect
                      value={course.targetGrade}
                      onChange={(v) => updateCourse(course.id, "targetGrade", v)}
                    />

                    {/* Target pts + diff */}
                    <div className="flex w-16 items-center gap-1.5">
                      <span className={`text-sm font-semibold tabular-nums ${GRADE_COLOR[course.targetGrade]}`}>
                        {targetPts.toFixed(2)}
                      </span>
                      {diff !== 0 && (
                        <span className={`text-xs font-medium ${diff > 0 ? "text-emerald-500" : "text-red-400"}`}>
                          {diff > 0 ? "▲" : "▼"}
                        </span>
                      )}
                    </div>

                    {/* Remove (hidden until hover) */}
                    <button
                      type="button"
                      onClick={() => removeCourse(course.id)}
                      className="absolute right-4 hidden rounded-full p-1 text-red-200 hover:bg-red-50 hover:text-red-500 group-hover:block dark:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-400"
                      aria-label="Remove course"
                    >
                      ✕
                    </button>

                  </li>
                );
              })}
            </ul>

            {/* Footer totals */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 border-t border-red-100 bg-red-50/60 px-5 py-3 dark:border-slate-700 dark:bg-slate-700/30">
              <p className="text-xs font-semibold text-red-500 dark:text-slate-400">Semester totals</p>
              <p className="w-14 text-center text-sm font-bold text-red-900 dark:text-slate-100">{semCredits}</p>
              <div />
              <p className="w-10 text-center text-sm font-bold text-red-900 dark:text-slate-100">
                {currentGPA.toFixed(2)}
              </p>
              <div />
              <p className="w-16 text-sm font-bold text-red-900 dark:text-slate-100">
                {targetGPA.toFixed(2)}
              </p>
            </div>

          </div>
        </div>

        {/* ── Grade scale reference ── */}
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-red-500 dark:text-indigo-400">
            Grade scale
          </p>
          <div className="flex flex-wrap gap-2">
            {GRADE_OPTIONS.map((g) => (
              <div
                key={g}
                className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              >
                <span className={`text-xs font-bold ${GRADE_COLOR[g]}`}>{g}</span>
                <span className="text-xs text-red-300 dark:text-slate-600">=</span>
                <span className="text-xs text-red-500 dark:text-slate-400">{GRADE_POINTS[g].toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
