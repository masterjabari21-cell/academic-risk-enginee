import Link from "next/link";
import { SiteHeader } from "../components/ui";

export const metadata = {
  title: "Terms of Use · Foresite",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#fdf4e7] text-red-900 dark:bg-slate-950 dark:text-slate-100">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl px-4 py-10 pb-20 sm:px-6 lg:px-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-500 dark:text-indigo-400">
          Legal
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-red-900 dark:text-white">
          Terms of Use
        </h1>
        <p className="mt-2 text-xs text-red-400/60 dark:text-slate-600">
          Last updated: March 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-red-800/80 dark:text-slate-300">

          <section>
            <h2 className="mb-2 text-base font-semibold text-red-900 dark:text-slate-100">
              Acceptance
            </h2>
            <p>
              By using Foresite you agree to these terms. If you don&apos;t agree, please don&apos;t
              use the service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-red-900 dark:text-slate-100">
              What Foresite is
            </h2>
            <p>
              Foresite is an academic planning tool that parses course syllabi and surfaces workload
              risk estimates. It is provided as-is, in beta, for informational and planning purposes
              only. Risk scores and recommendations are algorithmic estimates — they are not academic
              advice, and they are not guaranteed to be accurate.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-red-900 dark:text-slate-100">
              Your responsibilities
            </h2>
            <ul className="ml-4 list-disc space-y-1.5">
              <li>Only upload syllabi and documents you have the right to share.</li>
              <li>
                Do not use Foresite to process documents containing sensitive personal information
                beyond your own academic materials.
              </li>
              <li>
                Don&apos;t attempt to reverse-engineer, scrape, or abuse the service in ways that
                harm other users or the underlying infrastructure.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-red-900 dark:text-slate-100">
              Disclaimer of warranties
            </h2>
            <p>
              Foresite is provided &ldquo;as is&rdquo; without warranties of any kind. We make no
              guarantee that risk scores, danger week predictions, or recommendations will be
              accurate, complete, or suitable for any particular academic situation. Always verify
              deadlines and requirements directly with your course syllabus and instructor.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-red-900 dark:text-slate-100">
              Limitation of liability
            </h2>
            <p>
              To the maximum extent permitted by law, Foresite and its creators are not liable for
              any academic, financial, or other damages arising from reliance on the tool&apos;s
              output.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-red-900 dark:text-slate-100">
              Changes
            </h2>
            <p>
              We may update these terms as the product evolves. Continued use after a change
              constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-red-900 dark:text-slate-100">
              Contact
            </h2>
            <p>
              Questions? Use the Feedback button in{" "}
              <Link href="/settings" className="underline underline-offset-2 hover:text-red-600 dark:hover:text-indigo-400">
                Settings
              </Link>
              .
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}
