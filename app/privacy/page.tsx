import Link from "next/link";
import { SiteHeader } from "../components/ui";

export const metadata = {
  title: "Privacy Policy · Foresite",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#fdf4e7] text-red-900 dark:bg-slate-950 dark:text-slate-100">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl px-4 py-10 pb-20 sm:px-6 lg:px-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-500 dark:text-indigo-400">
          Legal
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-red-900 dark:text-white">
          Privacy Policy
        </h1>
        <p className="mt-2 text-xs text-red-400/60 dark:text-slate-600">
          Last updated: March 2026
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-red-800/80 dark:text-slate-300">

          <section>
            <h2 className="mb-2 text-base font-semibold text-red-900 dark:text-slate-100">
              The short version
            </h2>
            <p>
              Foresite processes your data entirely on your own device. Your syllabus files and
              academic information never leave your browser — they are never stored on our servers,
              never sold, and never shared with third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-red-900 dark:text-slate-100">
              What data we handle
            </h2>
            <ul className="ml-4 list-disc space-y-1.5">
              <li>
                <strong>Syllabus PDFs</strong> — uploaded by you, sent directly to the Claude AI
                API for text extraction, and never stored beyond the duration of that single
                request. We retain no copy.
              </li>
              <li>
                <strong>Parsed academic data</strong> (course names, assignment titles, due dates)
                — stored only in your browser&apos;s <code>localStorage</code>. Clearing your
                browser data removes it completely.
              </li>
              <li>
                <strong>Settings and preferences</strong> — stored locally in
                <code> localStorage</code>. Never transmitted to any server.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-red-900 dark:text-slate-100">
              Third-party services
            </h2>
            <p>
              Foresite uses the <strong>Anthropic Claude API</strong> solely to extract structured
              data from the syllabus PDF you upload. Anthropic&apos;s own{" "}
              <a
                href="https://www.anthropic.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-red-600 dark:hover:text-indigo-400"
              >
                privacy policy
              </a>{" "}
              governs that interaction. We do not use analytics, advertising, or tracking SDKs.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-red-900 dark:text-slate-100">
              FERPA
            </h2>
            <p>
              Because Foresite does not collect, store, or transmit educational records to any
              server we control, it does not operate as a "school official" or "third-party
              service" under FERPA. Your academic data remains exclusively on your own device.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-red-900 dark:text-slate-100">
              Deleting your data
            </h2>
            <p>
              Go to{" "}
              <Link href="/settings" className="underline underline-offset-2 hover:text-red-600 dark:hover:text-indigo-400">
                Settings → Data &amp; Privacy → Clear data
              </Link>{" "}
              to remove all locally stored information. You can also clear your browser&apos;s
              localStorage directly.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-red-900 dark:text-slate-100">
              Contact
            </h2>
            <p>
              Questions about this policy? Reach out via the Feedback button in{" "}
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
