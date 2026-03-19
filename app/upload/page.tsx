"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { SiteHeader } from "../components/ui";

interface UploadedFile {
  name: string;
  size: number;
  raw: File;
}

type Step = "idle" | "uploading" | "analyzing" | "done" | "error";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STEPS: { key: Step; label: string }[] = [
  { key: "uploading", label: "Extracting text" },
  { key: "analyzing", label: "AI analysis"     },
  { key: "done",      label: "Complete"         },
];

export default function UploadPage() {
  const router = useRouter();
  const [files,    setFiles]    = useState<UploadedFile[]>([]);
  const [step,     setStep]     = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      const fresh = accepted
        .filter((f) => !existing.has(f.name))
        .map((f) => ({ name: f.name, size: f.size, raw: f }));
      return [...prev, ...fresh];
    });
    setStep("idle");
    setErrorMsg(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
  });

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function handleAnalyze() {
    if (!files.length || step !== "idle") return;
    setErrorMsg(null);

    const formData = new FormData();
    files.forEach((f) => formData.append("file", f.raw));

    try {
      setStep("uploading");
      // Small delay so the user sees the step indicator before the network call
      await new Promise((r) => setTimeout(r, 400));

      setStep("analyzing");
      const res = await fetch("/api/analyze-syllabus", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Server error ${res.status}`);
      }

      const data = await res.json();
      localStorage.setItem("gr:analysis", JSON.stringify(data));

      setStep("done");
      router.push("/dashboard");
    } catch (err) {
      setStep("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const busy = step === "uploading" || step === "analyzing" || step === "done";

  return (
    <div className="min-h-screen bg-[#fdf4e7] text-red-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl px-4 py-10 pb-20 sm:px-6 lg:px-8">

        {/* Heading */}
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500 dark:text-indigo-400">
            Step 1 of 2
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-red-900 dark:text-white sm:text-4xl">
            Upload your syllabi
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-red-700/60 dark:text-slate-400">
            Drop in one or more course syllabus PDFs and GradeRadar will map out your semester — deadlines, workload peaks, and risk windows — automatically.
          </p>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed px-8 py-12 text-center transition-all duration-200 select-none ${
            isDragActive
              ? "scale-[1.01] border-red-500 bg-red-100/60 dark:border-indigo-400 dark:bg-indigo-900/20"
              : "border-red-200 bg-white hover:border-red-400 hover:bg-red-50/50 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/10"
          }`}
        >
          <input {...getInputProps()} />

          <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl transition-colors duration-200 ${
            isDragActive ? "bg-red-200 dark:bg-indigo-800/60" : "bg-red-100 dark:bg-slate-800"
          }`}>
            📄
          </div>

          <p className="text-base font-semibold text-red-900 dark:text-slate-100">
            {isDragActive ? "Drop your PDFs here" : "Drag & drop your syllabi"}
          </p>
          <p className="mt-1 text-sm text-red-500 dark:text-slate-500">
            or <span className="font-medium text-red-600 underline underline-offset-2 dark:text-indigo-400">browse files</span> from your device
          </p>
          <p className="mt-4 text-xs text-red-400/70 dark:text-slate-600">
            PDF only &nbsp;·&nbsp; Up to 20 MB per file &nbsp;·&nbsp; Multiple files supported
          </p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <ul className="mt-4 space-y-2">
            {files.map((file) => (
              <li
                key={file.name}
                className="flex items-center justify-between rounded-2xl border border-red-100 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/70"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-xl">📑</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-red-900 dark:text-slate-100">{file.name}</p>
                    <p className="text-xs text-red-400 dark:text-slate-500">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                  disabled={busy}
                  className="ml-4 flex-shrink-0 rounded-full p-1.5 text-red-300 transition hover:bg-red-100 hover:text-red-600 disabled:pointer-events-none dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  aria-label="Remove file"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Step progress indicator */}
        {busy && (
          <div className="mt-6 flex items-center justify-center gap-6 text-xs font-medium">
            {STEPS.map(({ key, label }, i) => {
              const order    = { uploading: 0, analyzing: 1, done: 2 } as Record<string, number>;
              const current  = order[step] ?? -1;
              const mine     = order[key]  ?? 0;
              const isDone   = current > mine;
              const isActive = current === mine;
              return (
                <div key={key} className={`flex items-center gap-1.5 transition-opacity ${isActive ? "opacity-100" : isDone ? "opacity-60" : "opacity-25"}`}>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isDone   ? "bg-green-500 text-white" :
                    isActive ? "bg-red-600 text-white dark:bg-indigo-600" :
                               "bg-red-100 text-red-400 dark:bg-slate-700 dark:text-slate-500"
                  }`}>
                    {isDone ? "✓" : i + 1}
                  </span>
                  <span className={isDone ? "text-green-600 dark:text-green-400" : isActive ? "text-red-700 dark:text-slate-200" : "text-red-300 dark:text-slate-600"}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Error */}
        {step === "error" && errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
            ⚠ {errorMsg}
          </div>
        )}

        {/* Info cards */}
        {!busy && (
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { icon: "📅", label: "Deadline mapping", desc: "Every due date pulled from your syllabus" },
              { icon: "⚡", label: "Workload peaks",   desc: "Weeks where assignments collide get flagged" },
              { icon: "🎯", label: "Risk windows",     desc: "High-risk periods surfaced before they hit" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-red-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <span className="text-2xl">{item.icon}</span>
                <p className="mt-2 text-sm font-semibold text-red-900 dark:text-slate-100">{item.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-red-500/80 dark:text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Analyze button */}
        <div className="mt-8">
          <button
            type="button"
            onClick={step === "error" ? () => { setStep("idle"); setErrorMsg(null); } : handleAnalyze}
            disabled={files.length === 0 || busy}
            className={`w-full rounded-2xl px-8 py-5 text-base font-bold tracking-wide transition-all duration-200 ${
              files.length === 0
                ? "cursor-not-allowed bg-red-100 text-red-300 dark:bg-slate-800 dark:text-slate-600"
                : busy
                ? "cursor-wait bg-red-600 text-white opacity-80 dark:bg-indigo-600"
                : step === "error"
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-red-600 text-white shadow-lg shadow-red-200 hover:bg-red-700 hover:shadow-red-300 active:scale-[0.98] dark:bg-indigo-600 dark:shadow-indigo-900 dark:hover:bg-indigo-500"
            }`}
          >
            {busy ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {step === "uploading" ? "Extracting text…" : step === "analyzing" ? "Analyzing with AI…" : "Redirecting…"}
              </span>
            ) : step === "error" ? "Try again" : files.length > 1 ? "Analyze Syllabi →" : "Analyze Syllabus →"}
          </button>

          {files.length === 0 && step !== "error" && (
            <p className="mt-3 text-center text-xs text-red-400/60 dark:text-slate-600">
              Upload at least one syllabus PDF to continue
            </p>
          )}
          {files.length > 0 && !busy && step !== "error" && (
            <p className="mt-3 text-center text-xs text-red-400/60 dark:text-slate-500">
              {files.length} file{files.length > 1 ? "s" : ""} ready &nbsp;·&nbsp; Claude will extract all deadlines
            </p>
          )}
        </div>

        {/* Skip link */}
        <p className="mt-8 text-center text-xs text-red-400/50 dark:text-slate-600">
          Want to see results first?{" "}
          <Link href="/dashboard" className="underline underline-offset-2 hover:text-red-600 dark:hover:text-indigo-400">
            View sample dashboard
          </Link>
        </p>

      </main>
    </div>
  );
}