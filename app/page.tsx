import Link from "next/link";
import { Button, Card, SiteHeader } from "./components/ui";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-900 to-indigo-700 text-slate-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-xl backdrop-blur sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="mb-3 inline-flex rounded-full border border-indigo-300/50 bg-indigo-200/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">
                Built for college students
              </p>
              <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
                Predict overload weeks and stop risk before it becomes a crisis.
              </h1>
              <p className="mt-4 max-w-2xl text-slate-200">
                Academic Risk Engine turns your course data into clear risk signals, time-to-act alerts, and study plans so you can keep your GPA and your sanity.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/upload">
                  <Button type="button" className="px-5 py-2.5 text-sm font-semibold">Start with your schedule</Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="ghost" type="button" className="border border-white/30 bg-white/10 text-white hover:bg-white/20">View sample insights</Button>
                </Link>
              </div>
              <p className="mt-3 text-xs text-slate-300">No credit card. No extra app. Use your existing class and grade data.</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-slate-900/60 p-4 text-sm text-slate-100">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Snapshot</p>
              <div className="mt-3 grid gap-3">
                <div className="rounded-xl bg-slate-800/70 p-3">
                  <p className="text-xs uppercase text-slate-300">Overload Score</p>
                  <div className="mt-1 text-xl font-semibold text-white">72/100</div>
                </div>
                <div className="rounded-xl bg-slate-800/70 p-3">
                  <p className="text-xs uppercase text-slate-300">At-risk modules</p>
                  <div className="mt-1 text-xl font-semibold text-white">3 this week</div>
                </div>
                <div className="rounded-xl bg-slate-800/70 p-3">
                  <p className="text-xs uppercase text-slate-300">Action plan</p>
                  <div className="mt-1 text-xl font-semibold text-white">Focus hours: 5</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Core outcomes</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">What you get in minutes</h2>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Card title="Predict overload weeks">Know exactly which week your schedule becomes unmanageable with transparent risk metrics.</Card>
            <Card title="Academic risk signals">Get early alerts for slipping grades, attendance drops, and burnout patterns.</Card>
            <Card title="Action-first recommendations">Receive prioritized study tasks and weekly checkpoints that keep progress on track.</Card>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-white/15 bg-slate-900/40 px-5 py-4 text-sm text-slate-200">
          <p className="font-medium text-indigo-200">Trusted by student groups and advisors who need fast, credible insights. Keep your semesters proactive instead of reactive.</p>
        </section>
      </main>
    </div>
  );
}
