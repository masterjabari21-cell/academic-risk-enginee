import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#03010f] text-white">

      {/* ── Ambient blobs ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-blob-1 absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-indigo-700/20 blur-[120px]" />
        <div className="animate-blob-2 absolute top-1/3 -right-60 h-[700px] w-[700px] rounded-full bg-violet-700/15 blur-[140px]" />
        <div className="animate-blob-3 absolute bottom-0 left-1/4 h-[500px] w-[500px] rounded-full bg-cyan-800/10 blur-[100px]" />
      </div>

      {/* ── Dot grid overlay ── */}
      <div aria-hidden className="animate-grid-pulse dot-grid pointer-events-none absolute inset-0" />

      {/* ── Scan line ── */}
      <div aria-hidden className="scan-line" />

      {/* ── Navigation ── */}
      <nav className="animate-fade-in-delay relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-indigo-400 animate-glow-pulse" />
          <span className="text-sm font-semibold tracking-widest text-indigo-300 uppercase">
            Academic Risk Engine
          </span>
        </div>
        <div className="hidden items-center gap-1 text-sm text-slate-400 sm:flex">
          <Link href="/upload" className="rounded-full px-4 py-1.5 transition hover:bg-white/5 hover:text-white">Upload</Link>
          <Link href="/dashboard" className="rounded-full px-4 py-1.5 transition hover:bg-white/5 hover:text-white">Dashboard</Link>
          <Link href="/settings" className="rounded-full px-4 py-1.5 transition hover:bg-white/5 hover:text-white">Settings</Link>
          <Link
            href="/upload"
            className="ml-2 rounded-full border border-indigo-500/50 bg-indigo-600/20 px-5 py-1.5 text-indigo-300 transition hover:bg-indigo-600/40 hover:text-white hover:border-indigo-400"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-24">

        {/* Badge */}
        <div className="animate-fade-up flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-glow-pulse" />
            AI-Powered Academic Intelligence
          </span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up-delay-1 mt-8 text-center text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
          <span className="text-white">Know the risks</span>
          <br />
          <span className="shimmer-text">before they know you.</span>
        </h1>

        {/* Subheadline */}
        <p className="animate-fade-up-delay-2 mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-slate-400">
          Academic Risk Engine transforms your course data into predictive signals — surfacing overload weeks, slipping grades, and burnout patterns before they become crises.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up-delay-3 mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/upload"
            className="glow-indigo relative rounded-full bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-95"
          >
            Start your analysis
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-semibold text-slate-300 backdrop-blur transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            View sample insights →
          </Link>
        </div>

        {/* Trust line */}
        <p className="animate-fade-up-delay-4 mt-5 text-center text-xs text-slate-600">
          No sign-up required &nbsp;·&nbsp; Works with your existing data &nbsp;·&nbsp; Results in minutes
        </p>

        {/* ── Live metrics strip ── */}
        <div className="animate-fade-up-delay-4 mt-20 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { value: "72", unit: "/100", label: "Current overload score" },
            { value: "3",  unit: " this week", label: "At-risk modules" },
            { value: "91", unit: "%", label: "Prediction confidence" },
            { value: "5",  unit: " hrs", label: "Recommended focus time" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-card rounded-2xl p-4 text-center transition-all duration-300"
            >
              <div className="text-2xl font-bold text-white sm:text-3xl">
                {stat.value}
                <span className="text-base font-normal text-indigo-400">{stat.unit}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Feature cards ── */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">

          <div className="glass-card animate-float rounded-2xl p-6 transition-all duration-300" style={{ animationDelay: "0s" }}>
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 text-xl">
              ◎
            </div>
            <h3 className="text-base font-semibold text-white">Predict Overload Weeks</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Know exactly which weeks your schedule becomes unmanageable — before it happens, not after.
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-indigo-500/30 to-transparent" />
          </div>

          <div className="glass-card animate-float rounded-2xl p-6 transition-all duration-300" style={{ animationDelay: "1.5s" }}>
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400 text-xl">
              ◈
            </div>
            <h3 className="text-base font-semibold text-white">Academic Risk Signals</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Early alerts for slipping grades, attendance drops, and burnout patterns — weeks ahead of time.
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-violet-500/30 to-transparent" />
          </div>

          <div className="glass-card animate-float rounded-2xl p-6 transition-all duration-300" style={{ animationDelay: "3s" }}>
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 text-xl">
              ◇
            </div>
            <h3 className="text-base font-semibold text-white">Action-First Plans</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Prioritized study tasks and weekly checkpoints that keep you on track without the guesswork.
            </p>
            <div className="mt-4 h-px bg-gradient-to-r from-cyan-500/30 to-transparent" />
          </div>

        </div>

        {/* ── Bottom CTA banner ── */}
        <div className="mt-10 overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-indigo-900/30 via-slate-900/20 to-violet-900/30 p-8 text-center backdrop-blur">
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-400">Ready to take control?</p>
          <h2 className="mt-3 text-2xl font-bold text-gradient sm:text-3xl">
            Your academic future starts with a single upload.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-500">
            Trusted by student groups and academic advisors who need fast, credible risk insights. Keep your semesters proactive — not reactive.
          </p>
          <Link
            href="/upload"
            className="glow-indigo mt-6 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-95"
          >
            Upload your schedule
            <span aria-hidden>→</span>
          </Link>
        </div>

      </main>
    </div>
  );
}
