"use client";

import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "ghost";

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    "rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:focus-visible:ring-indigo-500";
  const styles =
    variant === "ghost"
      ? "border border-red-200 bg-white text-red-900 hover:bg-red-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      : "bg-red-600 text-white hover:bg-red-700 dark:bg-indigo-600 dark:hover:bg-indigo-700";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

export function Card({
  title,
  children,
  className = "",
  footer,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-red-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className}`}>
      <div className="mb-3 text-lg font-bold text-red-900 dark:text-slate-100">{title}</div>
      <div className="text-sm text-red-800/70 dark:text-slate-300">{children}</div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}

export function PageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 text-sm uppercase tracking-[0.2em] text-red-600 dark:text-indigo-400">{title}</div>
      {children}
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-red-100 bg-[#fdf4e7]/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <Link href="/" className="text-xl font-bold text-red-900 dark:text-white">
            GradeRadar
          </Link>
        </div>
        <nav className="flex items-center gap-2 text-sm text-red-800 dark:text-slate-200">
          <Link href="/" className="rounded-full px-3 py-1 hover:bg-red-100 dark:hover:bg-slate-800">Home</Link>
          <Link href="/upload" className="rounded-full px-3 py-1 hover:bg-red-100 dark:hover:bg-slate-800">Upload</Link>
          <Link href="/dashboard" className="rounded-full px-3 py-1 hover:bg-red-100 dark:hover:bg-slate-800">Dashboard</Link>
          <Link href="/settings" className="rounded-full px-3 py-1 hover:bg-red-100 dark:hover:bg-slate-800">Settings</Link>
        </nav>
      </div>
    </header>
  );
}
