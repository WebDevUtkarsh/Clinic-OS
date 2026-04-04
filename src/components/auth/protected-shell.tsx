"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import type { SessionData } from "@/lib/frontend/auth-client";

type ProtectedShellProps = {
  session: SessionData;
  title: string;
  description: string;
  sideContent: ReactNode;
  onLogout: () => void;
  isLoggingOut?: boolean;
  children: ReactNode;
};

export function ProtectedShell({
  session,
  title,
  description,
  sideContent,
  onLogout,
  isLoggingOut = false,
  children,
}: ProtectedShellProps) {
  return (
    <main
      className={`${GeistSans.className} relative min-h-screen overflow-hidden bg-[#050505] px-6 pb-12 pt-28 text-white selection:bg-indigo-500/30 md:px-8`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.1),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:32px_32px]" />

      <nav className="fixed left-0 right-0 top-0 z-20 border-b border-white/5 bg-[#050505]/70 px-6 py-5 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-[0_0_24px_rgba(79,70,229,0.35)]">
                <ShieldCheck size={18} className="text-white" />
              </div>
              <div>
                <div className={`text-lg font-bold tracking-tight ${GeistMono.className}`}>
                  ClinicOS
                </div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-white/25">
                  Authenticated Session
                </div>
              </div>
            </Link>

            <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/45 md:block">
              {session.tenant.name} / {session.tenantStatus}
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
          >
            <LogOut size={14} />
            {isLoggingOut ? "Signing out" : "Logout"}
          </button>
        </div>
      </nav>

      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-300">
            <LayoutDashboard size={12} />
            Session workspace
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/45 md:text-lg">
            {description}
          </p>
          <div className="mt-8">{children}</div>
        </section>

        <aside>{sideContent}</aside>
      </div>
    </main>
  );
}
