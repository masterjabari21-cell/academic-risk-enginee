"use client";

import { useEffect, useState } from "react";
import { PageShell, SiteHeader } from "../components/ui";

const themes = {
  light: {
    label: "Light mode",
    className: "bg-white text-slate-900",
  },
  dark: {
    label: "Dark mode",
    className: "bg-slate-950 text-slate-100",
  },
};

export default function SettingsPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    document.documentElement.classList.remove("theme-light", "theme-dark");
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <div className={themes[theme].className + " min-h-screen transition-colors duration-200"}>
      <SiteHeader />
      <PageShell title="Settings">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/10 p-5 backdrop-blur sm:p-6">
          <div>
            <div className="text-sm font-semibold text-slate-200">Theme</div>
            <p className="mt-1 text-sm text-slate-300">Switch between light and dark mode for the app.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                theme === "light"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                theme === "dark"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              Dark
            </button>
          </div>
          <div className="rounded-xl border border-slate-300/20 p-3 bg-slate-900/20 text-sm text-slate-100">
            Current mode: <strong>{themes[theme].label}</strong>
          </div>
        </div>
      </PageShell>
    </div>
  );
}
