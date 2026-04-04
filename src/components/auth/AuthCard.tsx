import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type AuthBadgeProps = {
  children: ReactNode;
};

export function AuthBadge({ children }: AuthBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-badge-border bg-badge px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-badge-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      <span>{children}</span>
    </div>
  );
}

type AuthDividerProps = {
  label: string;
};

export function AuthDivider({ label }: AuthDividerProps) {
  return (
    <div className="flex items-center gap-4 text-xs text-text-muted">
      <div className="h-px flex-1 bg-border" />
      <span className="whitespace-nowrap">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

type AuthCardProps = {
  badge?: ReactNode;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function AuthCard({
  badge,
  topLeft,
  topRight,
  title,
  description,
  children,
  footer,
  className,
  bodyClassName,
}: AuthCardProps) {
  return (
    <div className="relative w-full max-w-md">
      <div className="pointer-events-none absolute inset-x-10 top-4 h-32 rounded-full bg-analytics/15 blur-3xl" />
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_80px_-40px_rgba(15,23,42,0.65)]",
          className,
        )}
      >
        <div className="border-b border-border px-8 py-7">
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              {topLeft ?? badge}
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {title}
                </h1>
                <p className="text-sm leading-6 text-text-secondary">{description}</p>
              </div>
            </div>
            {topRight}
          </div>
        </div>
        <div className={cn("space-y-5 px-8 py-7", bodyClassName)}>{children}</div>
        {footer ? <div className="border-t border-border px-8 py-5">{footer}</div> : null}
      </div>
    </div>
  );
}
