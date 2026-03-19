"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ButtonHTMLAttributes, ReactNode, useState, useEffect } from "react";

type ButtonVariant = "primary" | "ghost";

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    "rounded-full px-4 py-2 text-sm font-semibold transition " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "focus-visible:ring-red-500 focus-visible:ring-offset-white " +
    "dark:focus-visible:ring-indigo-500 dark:focus-visible:ring-offset-slate-950";
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
      <div className="mb-2.5 text-base font-semibold text-red-900 dark:text-slate-100">{title}</div>
      <div className="text-sm leading-relaxed text-red-800/70 dark:text-slate-300">{children}</div>
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
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="mb-8 text-xs font-semibold uppercase tracking-widest text-red-500 dark:text-indigo-400">{title}</p>
      {children}
    </div>
  );
}

const NAV_LINKS = [
  { href: "/",          label: "Home"      },
  { href: "/upload",    label: "Upload"    },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/simulate",  label: "GPA Sim"   },
  { href: "/settings",  label: "Settings"  },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-red-100 bg-[#fdf4e7]/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link href="/" className="text-base font-bold tracking-tight text-red-900 dark:text-white">
            GradeRadar
          </Link>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="group flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 bg-white shadow-sm transition hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="1" width="14" height="2" rx="1" className="fill-red-900 transition-colors group-hover:fill-red-600 dark:fill-slate-100 dark:group-hover:fill-purple-400" />
              <rect x="4" y="6" width="10" height="2" rx="1" className="fill-red-900 transition-colors group-hover:fill-red-600 dark:fill-slate-100 dark:group-hover:fill-purple-400" />
              <rect x="6" y="11" width="6" height="2" rx="1" className="fill-red-900 transition-colors group-hover:fill-red-600 dark:fill-slate-100 dark:group-hover:fill-purple-400" />
            </svg>
          </button>
        </div>
      </header>

      {/* Blurred backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-30 bg-black/25 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Slide-in drawer */}
      <div
        className={`fixed top-0 right-0 z-40 flex h-full w-64 flex-col bg-[#fdf4e7] shadow-2xl transition-transform duration-300 ease-in-out dark:bg-slate-900 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-red-100 px-5 py-4 dark:border-slate-700">
          <span className="text-sm font-bold tracking-tight text-red-900 dark:text-white">GradeRadar</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-red-400 transition hover:bg-red-100 hover:text-red-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 1l10 10M11 1L1 11" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-4">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive(href)
                  ? "bg-red-100 text-red-900 dark:bg-slate-700 dark:text-white"
                  : "text-red-700/70 hover:bg-red-50 hover:text-red-900 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
