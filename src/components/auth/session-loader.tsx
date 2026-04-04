"use client";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Loader2, ShieldCheck } from "lucide-react";

type SessionLoaderProps = {
  title: string;
  description: string;
};

export function SessionLoader({ title, description }: SessionLoaderProps) {
  return (
    <main
      className={`${GeistSans.className} flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_28%)]" />
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-[0_0_60px_rgba(79,70,229,0.12)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-[0_0_24px_rgba(79,70,229,0.3)]">
          <ShieldCheck size={24} className="text-white" />
        </div>
        <div
          className={`mt-5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-indigo-300 ${GeistMono.className}`}
        >
          <Loader2 size={12} className="animate-spin" />
          Loading secure session
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/45">{description}</p>
      </div>
    </main>
  );
}
