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
  {
    href: "/", label: "Home",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6.5L8 2l6 4.5V14H10v-3.5H6V14H2V6.5z" />
      </svg>
    ),
  },
  {
    href: "/upload", label: "Upload",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 10V3M5 6l3-3 3 3" /><rect x="2" y="11" width="12" height="3" rx="1" />
      </svg>
    ),
  },
  {
    href: "/dashboard", label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" />
      </svg>
    ),
  },
  {
    href: "/simulate", label: "GPA Sim",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2,12 5,8 8,10 11,5 14,3" />
      </svg>
    ),
  },
  {
    href: "/settings", label: "Settings",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="2.5" />
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.42 1.42M11.36 11.36l1.42 1.42M3.22 12.78l1.42-1.42M11.36 4.64l1.42-1.42" />
      </svg>
    ),
  },
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
        className={`fixed top-0 right-0 z-40 flex h-full w-72 flex-col shadow-2xl transition-transform duration-300 ease-in-out
          bg-gradient-to-b from-[#fff8f0] to-[#fdf4e7]
          dark:bg-none dark:bg-slate-900
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5">
          <div>
            <p className="text-base font-bold tracking-tight text-red-900 dark:text-white">GradeRadar</p>
            <p className="text-[11px] text-red-400 dark:text-slate-500">Academic risk engine</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-red-300 transition hover:bg-red-100 hover:text-red-700 dark:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M1 1l10 10M11 1L1 11" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-gradient-to-r from-red-200 via-red-100 to-transparent dark:from-slate-700 dark:via-slate-800 dark:to-transparent" />

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-4 pt-5">
          {NAV_LINKS.map(({ href, label, icon }, i) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                style={{ transitionDelay: open ? `${i * 40}ms` : "0ms" }}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-red-600 text-white shadow-md shadow-red-200 dark:bg-indigo-600 dark:shadow-indigo-900/40"
                    : "text-red-800/70 hover:bg-white/80 hover:text-red-900 hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-white"
                }`}
              >
                <span className={`shrink-0 transition-colors ${active ? "text-white/90" : "text-red-400 group-hover:text-red-600 dark:text-slate-500 dark:group-hover:text-slate-200"}`}>
                  {icon}
                </span>
                {label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/70" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto px-6 pb-8">
          <div className="rounded-2xl bg-red-50 px-4 py-3 dark:bg-slate-800">
            <p className="text-[11px] font-semibold text-red-500 dark:text-indigo-400">Tip</p>
            <p className="mt-0.5 text-xs text-red-400/80 dark:text-slate-500">Upload a syllabus to get your personalized risk score.</p>
          </div>
        </div>
      </div>
    </>
  );
}
