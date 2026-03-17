"use client";

import { useState } from "react";
import { SiteHeader } from "../components/ui";

export default function SettingsPage() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined" && localStorage.getItem("theme") === "dark") return "dark";
    return "light";
  });

  function applyTheme(next: "light" | "dark") {
    setTheme(next);
    localStorage.setItem("theme", next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  return (
    <div className="min-h-screen bg-[#fdf4e7] text-red-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl px-4 py-10 pb-20 sm:px-6 lg:px-8">

        <p className="mb-8 text-xs font-semibold uppercase tracking-widest text-red-500 dark:text-indigo-400">
          Settings
        </p>

        <div className="max-w-sm space-y-6">

          {/* Theme */}
          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <p className="text-sm font-semibold text-red-900 dark:text-slate-100">Appearance</p>
            <p className="mt-1 text-xs text-red-600/60 dark:text-slate-400">
              Choose how GradeRadar looks on your device.
            </p>
            <div className="mt-4 flex gap-2">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => applyTheme(t)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-semibold capitalize transition ${
                    theme === t
                      ? "border-red-600 bg-red-600 text-white dark:border-indigo-500 dark:bg-indigo-600"
                      : "border-red-100 bg-red-50 text-red-700 hover:bg-red-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
