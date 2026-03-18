"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { SiteHeader } from "../components/ui";

interface UploadedFile {
  name: string;
  size: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      const fresh = accepted
        .filter((f) => !existing.has(f.name))
        .map((f) => ({ name: f.name, size: f.size }));
      return [...prev, ...fresh];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
  });

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function handleAnalyze() {
    if (!files.length || analyzing) return;
    setAnalyzing(true);
    setTimeout(() => router.push("/dashboard"), 2200);
  }

  return (
    <div className="min-h-screen bg-[#fdf4e7] text-red-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl px-4 py-10 pb-20 sm:px-6 lg:px-8">

        {/* Page heading */}
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500 dark:text-indigo-400">
            Step 1 of 2
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-red-900 dark:text-white sm:text-4xl">
            Upload your syllabus
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-red-700/60 dark:text-slate-400">
            Drop in your course syllabus PDFs and GradeRadar will map out your semester — deadlines, workload peaks, and risk windows — automatically.
          </p>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`
            relative cursor-pointer rounded-2xl border-2 border-dashed px-8 py-12 text-center
            transition-all duration-200 select-none
            ${isDragActive
              ? "scale-[1.01] border-red-500 bg-red-100/60 dark:border-indigo-400 dark:bg-indigo-900/20"
              : "border-red-200 bg-white hover:border-red-400 hover:bg-red-50/50 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/10"
            }
          `}
        >
          <input {...getInputProps()} />

          <div className={`
            mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl
            transition-colors duration-200
            ${isDragActive ? "bg-red-200 dark:bg-indigo-800/60" : "bg-red-100 dark:bg-slate-800"}
          `}>
            📄
          </div>

          <p className="text-base font-semibold text-red-900 dark:text-slate-100">
            {isDragActive ? "Drop your PDFs here" : "Drag & drop your syllabus PDFs"}
          </p>
          <p className="mt-1 text-sm text-red-500 dark:text-slate-500">
            or <span className="font-medium text-red-600 underline underline-offset-2 dark:text-indigo-400">browse files</span> from your device
          </p>
          <p className="mt-4 text-xs text-red-400/70 dark:text-slate-600">
            PDF only &nbsp;·&nbsp; Up to 20 MB per file &nbsp;·&nbsp; Multiple syllabuses welcome
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
                  className="ml-4 flex-shrink-0 rounded-full p-1.5 text-red-300 transition hover:bg-red-100 hover:text-red-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  aria-label="Remove file"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* What we extract */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { icon: "📅", label: "Deadline mapping",  desc: "Every due date pulled from your syllabuses" },
            { icon: "⚡", label: "Workload peaks",    desc: "Weeks where assignments collide get flagged" },
            { icon: "🎯", label: "Risk windows",      desc: "High-risk periods surfaced before they hit" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-red-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <span className="text-2xl">{item.icon}</span>
              <p className="mt-2 text-sm font-semibold text-red-900 dark:text-slate-100">{item.label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-red-500/80 dark:text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Analyze button */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={files.length === 0 || analyzing}
            className={`
              w-full rounded-2xl px-8 py-5 text-base font-bold tracking-wide transition-all duration-200
              ${files.length === 0
                ? "cursor-not-allowed bg-red-100 text-red-300 dark:bg-slate-800 dark:text-slate-600"
                : analyzing
                ? "cursor-wait bg-red-600 text-white opacity-80 dark:bg-indigo-600"
                : "bg-red-600 text-white shadow-lg shadow-red-200 hover:bg-red-700 hover:shadow-red-300 active:scale-[0.98] dark:bg-indigo-600 dark:shadow-indigo-900 dark:hover:bg-indigo-500"
              }
            `}
          >
            {analyzing ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Analyzing your semester…
              </span>
            ) : (
              "Analyze Syllabus →"
            )}
          </button>

          {files.length === 0 && (
            <p className="mt-3 text-center text-xs text-red-400/60 dark:text-slate-600">
              Upload at least one syllabus PDF to continue
            </p>
          )}

          {files.length > 0 && !analyzing && (
            <p className="mt-3 text-center text-xs text-red-400/60 dark:text-slate-500">
              {files.length} file{files.length > 1 ? "s" : ""} ready &nbsp;·&nbsp; Takes about 2 seconds
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