"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ButtonHTMLAttributes, ReactNode, useState, useEffect, useRef } from "react";

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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-red-100 bg-[#fdf4e7]/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="text-base font-bold tracking-tight text-red-900 dark:text-white">
          GradeRadar
        </Link>

        {/* Nav dropdown */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 bg-white shadow-sm transition hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="1" width="14" height="2" rx="1" className="fill-red-900 dark:fill-slate-100" />
              <rect x="4" y="6" width="10" height="2" rx="1" className="fill-red-900 dark:fill-slate-100" />
              <rect x="6" y="11" width="6" height="2" rx="1" className="fill-red-900 dark:fill-slate-100" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-red-100 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive(href)
                      ? "bg-red-50 text-red-900 dark:bg-slate-700 dark:text-white"
                      : "text-red-700/80 hover:bg-red-50 hover:text-red-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
