import Link from "next/link";
import { Button, Card, PageShell, SiteHeader } from "../components/ui";

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <SiteHeader />
      <PageShell title="Upload student data">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card
            title="Import CSV"
            footer={<Button type="button">Choose file</Button>}
          >
            Upload your student performance dataset in CSV format.
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              We recommend columns like student_id, course, attendance_pct, grades, and risk_factors.
            </div>
          </Card>

          <Card title="Quick guide">
            <ul className="list-disc pl-4 text-slate-700 dark:text-slate-300">
              <li>Step 1: Download template</li>
              <li>Step 2: Map columns</li>
              <li>Step 3: Run risk analysis</li>
            </ul>
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" type="button">
                Download template
              </Button>
              <Button type="button">Start analysis</Button>
            </div>
          </Card>
        </div>
        <div className="mt-6 rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-4 text-sm text-indigo-800 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
          Tip: Keep your uploaded files under 20MB for fastest previews.
        </div>
        <div className="mt-6 text-slate-700 dark:text-slate-300">
          <Link href="/dashboard" className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
            Go to dashboard
          </Link>
        </div>
      </PageShell>
    </div>
  );
}
