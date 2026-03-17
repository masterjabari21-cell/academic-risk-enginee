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
    "rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";
  const styles =
    variant === "ghost"
      ? "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
      : "bg-indigo-600 text-white hover:bg-indigo-700";
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
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-3 text-lg font-bold text-slate-900">{title}</div>
      <div className="text-sm text-slate-600">{children}</div>
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
      <div className="mb-6 text-sm uppercase tracking-[0.2em] text-indigo-600">{title}</div>
      {children}
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <Link href="/" className="text-xl font-bold text-slate-900">
            Academic Risk Engine
          </Link>
        </div>
        <nav className="flex items-center gap-2 text-sm text-slate-700">
          <Link href="/" className="rounded-full px-3 py-1 hover:bg-slate-100">Home</Link>
          <Link href="/upload" className="rounded-full px-3 py-1 hover:bg-slate-100">Upload</Link>
          <Link href="/dashboard" className="rounded-full px-3 py-1 hover:bg-slate-100">Dashboard</Link>
          <Link href="/settings" className="rounded-full px-3 py-1 hover:bg-slate-100">Settings</Link>
        </nav>
      </div>
    </header>
  );
}
