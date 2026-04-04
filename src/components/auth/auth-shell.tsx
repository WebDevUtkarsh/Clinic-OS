"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ShieldCheck } from "lucide-react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  sideContent: ReactNode;
  children: ReactNode;
  topAction?: {
    href: string;
    label: string;
  };
};

export function AuthShell({
  eyebrow,
  title,
  description,
  sideContent,
  children,
  topAction,
}: AuthShellProps) {
  return (
    <main
      className={`${GeistSans.className} relative min-h-screen overflow-hidden bg-[#050505] px-6 pb-10 pt-28 text-white selection:bg-indigo-500/30 md:px-8`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-indigo-500/8 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-size-[34px_34px]" />

      <nav className="fixed left-0 right-0 top-0 z-20 border-b border-white/5 bg-[#050505]/70 px-6 py-5 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-[0_0_24px_rgba(79,70,229,0.35)]">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div>
              <div className={`text-lg font-bold tracking-tight ${GeistMono.className}`}>
                ClinicOS
              </div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/25">
                Secure Control Plane
              </div>
            </div>
          </Link>

          {topAction ? (
            <Link
              href={topAction.href}
              className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/45 transition-colors hover:text-white"
            >
              {topAction.label}
            </Link>
          ) : null}
        </div>
      </nav>

      <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <motion.section
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden lg:block"
        >
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-300">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            {eyebrow}
          </div>
          <h1 className="max-w-xl text-5xl font-bold leading-[0.92] tracking-tight xl:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/45">
            {description}
          </p>
          <div className="mt-10">{sideContent}</div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="relative"
        >
          {children}
        </motion.section>
      </div>

      <div className="pointer-events-none fixed bottom-6 left-0 right-0 hidden px-8 md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-[10px] uppercase tracking-[0.28em] text-white/18">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.65)]" />
            Session fabric stable
          </span>
          <span className={GeistMono.className}>TENORIX_SYSTEMS // 2026</span>
        </div>
      </div>
    </main>
  );
}
