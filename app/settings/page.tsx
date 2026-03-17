"use client";

import { useState } from "react";
import { PageShell, SiteHeader } from "../components/ui";

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
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <SiteHeader />
      <PageShell title="Settings">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Theme</div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Switch between light and dark mode for the app.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyTheme("light")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                theme === "light"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => applyTheme("dark")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                theme === "dark"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              Dark
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
            Current mode: <strong>{theme === "dark" ? "Dark mode" : "Light mode"}</strong>
          </div>
        </div>
      </PageShell>
    </div>
  );
}
