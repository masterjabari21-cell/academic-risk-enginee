"use client";

import { useState } from "react";
import { SiteHeader } from "../components/ui";

// ── Types ──────────────────────────────────────────────────────────────────

interface NotificationSettings {
  deadlineReminders: boolean;
  weeklyRiskSummary: boolean;
  highRiskAlerts: boolean;
  examCountdowns: boolean;
}

interface Profile {
  semester: string;
  standing: string;
  gpaGoal: string;
  major: string;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SettingSection({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-red-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-red-50 px-5 py-4 dark:border-slate-700">
        <p className="text-sm font-semibold text-red-900 dark:text-slate-100">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-red-600/50 dark:text-slate-500">{description}</p>
        )}
      </div>
      <div className="divide-y divide-red-50 dark:divide-slate-700">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-red-900 dark:text-slate-100">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-red-500/70 dark:text-slate-500">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-indigo-500 dark:focus-visible:ring-offset-slate-900 ${
        checked
          ? "bg-red-600 dark:bg-indigo-600"
          : "bg-red-100 dark:bg-slate-700"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function Select({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-red-100 bg-white px-3 py-1.5 text-sm text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-indigo-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Persistence helpers ────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    load<string>("theme", "light") === "dark" ? "dark" : "light"
  );

  const [notifications, setNotifications] = useState<NotificationSettings>(() =>
    load("gr:notifications", {
      deadlineReminders: true,
      weeklyRiskSummary: true,
      highRiskAlerts: true,
      examCountdowns: false,
    })
  );

  const [profile, setProfile] = useState<Profile>(() =>
    load("gr:profile", {
      semester: "spring-2025",
      standing: "junior",
      gpaGoal: "3.50",
      major: "Computer Science",
    })
  );

  const [riskSensitivity, setRiskSensitivity] = useState<string>(() =>
    load("gr:riskSensitivity", "balanced")
  );

  const [cleared, setCleared] = useState(false);

  function applyTheme(next: "light" | "dark") {
    setTheme(next);
    save("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  function toggleNotification(key: keyof NotificationSettings) {
    setNotifications((prev: NotificationSettings) => {
      const next = { ...prev, [key]: !prev[key] };
      save("gr:notifications", next);
      return next;
    });
  }

  function updateProfile(key: keyof Profile, value: string) {
    setProfile((prev) => {
      const next = { ...prev, [key]: value };
      save("gr:profile", next);
      return next;
    });
  }

  function updateRiskSensitivity(value: string) {
    setRiskSensitivity(value);
    save("gr:riskSensitivity", value);
  }

  function handleClearData() {
    setCleared(true);
    setTimeout(() => setCleared(false), 2500);
  }

  return (
    <div className="min-h-screen bg-[#fdf4e7] text-red-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-10 pb-20 sm:px-6 lg:px-8">

        <p className="mb-8 text-xs font-semibold uppercase tracking-widest text-red-500 dark:text-indigo-400">
          Settings
        </p>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">

          {/* ── Left column ── */}
          <div className="space-y-5">

            {/* Appearance */}
            <SettingSection title="Appearance" description="Customize how GradeRadar looks.">
              <SettingRow label="Theme" description="Switch between light and dark mode.">
                <div className="flex gap-1.5">
                  {(["light", "dark"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => applyTheme(t)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        theme === t
                          ? "bg-red-600 text-white dark:bg-indigo-600"
                          : "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </SettingRow>
            </SettingSection>

            {/* Academic Profile */}
            <SettingSection title="Academic Profile" description="Used to personalize your risk analysis.">
              <SettingRow label="Current Semester">
                <Select
                  value={profile.semester}
                  onChange={(v) => updateProfile("semester", v)}
                  options={[
                    { value: "fall-2024",   label: "Fall 2024"   },
                    { value: "spring-2025", label: "Spring 2025" },
                    { value: "fall-2025",   label: "Fall 2025"   },
                    { value: "spring-2026", label: "Spring 2026" },
                  ]}
                />
              </SettingRow>
              <SettingRow label="Academic Standing">
                <Select
                  value={profile.standing}
                  onChange={(v) => updateProfile("standing", v)}
                  options={[
                    { value: "freshman",  label: "Freshman"  },
                    { value: "sophomore", label: "Sophomore" },
                    { value: "junior",    label: "Junior"    },
                    { value: "senior",    label: "Senior"    },
                    { value: "graduate",  label: "Graduate"  },
                  ]}
                />
              </SettingRow>
              <SettingRow label="GPA Goal" description="Target GPA (0.0 – 4.33)">
                <input
                  type="number"
                  min="0"
                  max="4.33"
                  step="0.01"
                  value={profile.gpaGoal}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || (parseFloat(v) >= 0 && parseFloat(v) <= 4.33)) {
                      updateProfile("gpaGoal", v);
                    }
                  }}
                  onBlur={(e) => {
                    const n = parseFloat(e.target.value);
                    if (isNaN(n)) updateProfile("gpaGoal", "3.50");
                    else updateProfile("gpaGoal", Math.min(4.33, Math.max(0, n)).toFixed(2));
                  }}
                  className="w-24 rounded-lg border border-red-100 bg-white px-3 py-1.5 text-sm text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-indigo-500"
                />
              </SettingRow>
              <SettingRow label="Major" description="Used to weight assignment types.">
                <input
                  type="text"
                  value={profile.major}
                  onChange={(e) => updateProfile("major", e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-40 rounded-lg border border-red-100 bg-white px-3 py-1.5 text-sm text-red-900 placeholder:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-indigo-500"
                />
              </SettingRow>
            </SettingSection>

          </div>

          {/* ── Right column ── */}
          <div className="space-y-5">

            {/* Notifications */}
            <SettingSection title="Notifications" description="Control which alerts GradeRadar sends you.">
              <SettingRow label="Deadline Reminders" description="Get reminded 48 hrs before due dates.">
                <Toggle checked={notifications.deadlineReminders} onChange={() => toggleNotification("deadlineReminders")} />
              </SettingRow>
              <SettingRow label="Weekly Risk Summary" description="A digest of your week every Monday.">
                <Toggle checked={notifications.weeklyRiskSummary} onChange={() => toggleNotification("weeklyRiskSummary")} />
              </SettingRow>
              <SettingRow label="High-Risk Alerts" description="Instant alerts when your score spikes.">
                <Toggle checked={notifications.highRiskAlerts} onChange={() => toggleNotification("highRiskAlerts")} />
              </SettingRow>
              <SettingRow label="Exam Countdowns" description="Daily countdowns in the week before exams.">
                <Toggle checked={notifications.examCountdowns} onChange={() => toggleNotification("examCountdowns")} />
              </SettingRow>
            </SettingSection>

            {/* Risk preferences */}
            <SettingSection title="Risk Preferences" description="Adjust how aggressively GradeRadar flags risk.">
              <SettingRow label="Sensitivity" description="How easily your score reaches 'High' risk.">
                <Select
                  value={riskSensitivity}
                  onChange={updateRiskSensitivity}
                  options={[
                    { value: "conservative", label: "Conservative" },
                    { value: "balanced",     label: "Balanced"     },
                    { value: "aggressive",   label: "Aggressive"   },
                  ]}
                />
              </SettingRow>
            </SettingSection>

            {/* Data */}
            <SettingSection title="Data & Privacy" description="Manage your uploaded data.">
              <SettingRow label="Uploaded Syllabuses" description="Remove all files from this session.">
                <button
                  type="button"
                  onClick={handleClearData}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    cleared
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  }`}
                >
                  {cleared ? "✓ Cleared" : "Clear data"}
                </button>
              </SettingRow>
              <SettingRow label="Export Risk Report" description="Download your semester analysis as PDF.">
                <button
                  type="button"
                  className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                >
                  Export PDF
                </button>
              </SettingRow>
            </SettingSection>

          </div>

        </div>

        {/* About */}
        <div className="mt-5 rounded-2xl border border-red-100 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-red-900 dark:text-slate-100">GradeRadar</p>
              <p className="mt-0.5 text-xs text-red-400 dark:text-slate-500">Version 0.1.0 · Frontend preview · No data leaves your device.</p>
            </div>
            <div className="flex gap-3 text-xs text-red-400 dark:text-slate-500">
              <button type="button" className="hover:text-red-600 dark:hover:text-slate-300">Privacy</button>
              <button type="button" className="hover:text-red-600 dark:hover:text-slate-300">Terms</button>
              <button type="button" className="hover:text-red-600 dark:hover:text-slate-300">Feedback</button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
