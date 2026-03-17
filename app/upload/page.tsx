import Link from "next/link";
import { Button, Card, PageShell, SiteHeader } from "../components/ui";

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <PageShell title="Upload student data">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card
            title="Import CSV"
            footer={<Button type="button">Choose file</Button>}
          >
            Upload your student performance dataset in CSV format.
            <div className="mt-2 text-xs text-slate-500">
              We recommend columns like student_id, course, attendance_pct, grades, and risk_factors.
            </div>
          </Card>

          <Card title="Quick guide">
            <ul className="list-disc pl-4 text-slate-700">
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
        <div className="mt-6 rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-4 text-sm text-indigo-800">
          Tip: Keep your uploaded files under 20MB for fastest previews.
        </div>
        <div className="mt-6 text-slate-700">
          <Link href="/dashboard" className="font-medium text-indigo-600 hover:text-indigo-700">
            Go to dashboard
          </Link>
        </div>
      </PageShell>
    </div>
  );
}
