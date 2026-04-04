"use client";

import type { ReactNode } from "react";
import { KeyRound, Moon, ShieldCheck, SunMedium } from "lucide-react";
import { AuthBadge } from "@/components/auth/AuthCard";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "@/providers/theme-provider";

type AuthLayoutProps = {
  children: ReactNode;
  fullWidth?: boolean;
};

function ThemeSwitch() {
  const { mounted, resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="fixed right-6 top-6 z-30 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-input-border bg-card text-foreground shadow-sm transition-all duration-200 ease-out hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:right-8"
    >
      {!mounted || isDark ? <SunMedium size={16} /> : <Moon size={16} />}
    </button>
  );
}

function BrandMark() {
  return (
    <div className="fixed left-6 top-6 z-30 flex items-center gap-3 lg:left-8">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
        <div className="grid grid-cols-2 gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        </div>
      </div>
      <div className="text-lg font-bold tracking-tight text-foreground">Clinic OS</div>
    </div>
  );
}

function MarketingPanel() {
  return (
    <section className="flex flex-col justify-center px-6 pb-6 pt-24 lg:px-16">
      <div className="space-y-7">
        <AuthBadge>Secure access</AuthBadge>
        <div className="space-y-6">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
            Production login for a facility-scoped healthcare workspace.
          </h1>
          <p className="max-w-2xl text-base leading-[1.6] text-text-secondary">
            ClinicOS keeps tenant and facility isolation in the request path, not
            in browser memory. The frontend restores your session with
            credentials-based requests and routes you into the correct onboarding
            or facility dashboard flow.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 transition-colors duration-200 hover:border-badge-border">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <ShieldCheck size={18} />
            </div>
            <div className="text-sm font-semibold text-foreground">
              HttpOnly session model
            </div>
            <p className="mt-3 text-[13px] leading-[1.6] text-text-muted">
              Tokens never touch Zustand or local storage. Every API call uses
              `credentials: &quot;include&quot;`.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 transition-colors duration-200 hover:border-badge-border">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound size={18} />
            </div>
            <div className="text-sm font-semibold text-foreground">
              URL-driven facility scope
            </div>
            <p className="mt-3 text-[13px] leading-[1.6] text-text-muted">
              After sign-in, the facility in the URL becomes the source of truth
              for data fetching and query isolation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AuthLayout({ children, fullWidth = false }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <BrandMark />
      <ThemeSwitch />

      <div
        className={cn(
          "mx-auto flex min-h-screen w-full max-w-360 px-6 py-20 lg:px-8",
          fullWidth
            ? "items-center justify-center"
            : "items-center justify-center lg:grid lg:grid-cols-[1.1fr_0.9fr]",
        )}
      >
        {fullWidth ? (
          <div className="w-full max-w-5xl pt-16">{children}</div>
        ) : (
          <>
            <div className="hidden lg:block">
              <MarketingPanel />
            </div>
            <div className="flex items-center justify-center pt-16 lg:px-6">
              {children}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
