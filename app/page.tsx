import Link from "next/link";
import { Button, Card, PageShell, SiteHeader } from "./components/ui";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-100 via-slate-100 to-white text-slate-900">
      <SiteHeader />
      <PageShell title="Welcome">
        <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-600">Academic Risk Engine</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Track student risk with confidence.</h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Upload student performance data, run risk analysis, and view actionable insights in one clean dashboard.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/upload">
                <Button type="button">Upload data</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" type="button">Go to dashboard</Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Card title="Fast setup">Start with CSV, map fields, and preview risk.</Card>
          <Card title="Actionable">See at-risk cohorts and choose interventions.</Card>
          <Card title="Extendable">Add models or filters each day as your analysis grows.</Card>
        </div>
      </PageShell>
    </div>
  );
}
