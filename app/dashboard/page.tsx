import { Button, Card, PageShell, SiteHeader } from "../components/ui";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <SiteHeader />
      <PageShell title="Risk dashboard">
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="At-risk students" className="md:col-span-1">
            24 students flagged in current cohort.
          </Card>
          <Card title="Average engagement" className="md:col-span-1">
            82% course activity rate.
          </Card>
          <Card title="Prediction confidence" className="md:col-span-1">
            91% confidence in current risk model.
          </Card>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Overview</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">Latest insights</h2>
            </div>
            <Button type="button">Refresh</Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700/50">
              <div className="text-xs uppercase text-slate-500 dark:text-slate-400">Module completion</div>
              <div className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">78%</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700/50">
              <div className="text-xs uppercase text-slate-500 dark:text-slate-400">Missing assignments</div>
              <div className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">12</div>
            </div>
          </div>
        </section>
      </PageShell>
    </div>
  );
}
