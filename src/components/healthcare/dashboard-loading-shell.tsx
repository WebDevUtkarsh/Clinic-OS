import { Skeleton } from "@/components/ui/skeleton";

export function DashboardLoadingShell() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r border-border/70 bg-card/70 px-6 py-8 lg:block">
        <Skeleton className="h-10 w-32" />
        <div className="mt-10 space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </aside>
      <main className="space-y-8 px-6 py-6 md:px-10">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </main>
    </div>
  );
}
