import { Skeleton } from "@/components/ui/skeleton";

export function DashboardLoadingShell() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0F14]">
      <aside className="fixed inset-y-0 left-0 hidden w-[296px] border-r border-gray-200 bg-white px-4 py-6 lg:block dark:border-white/[0.06] dark:bg-[#0D1117]">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl bg-black/5 dark:bg-white/[0.06]" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 bg-black/5 dark:bg-white/[0.06]" />
            <Skeleton className="h-3 w-28 bg-black/5 dark:bg-white/[0.06]" />
          </div>
        </div>
        <Skeleton className="mt-6 h-14 w-full rounded-xl bg-black/5 dark:bg-white/[0.06]" />
        <div className="mt-8 space-y-3">
          <Skeleton className="h-10 w-16 bg-black/5 dark:bg-white/[0.06]" />
          <Skeleton className="h-12 w-full bg-black/5 dark:bg-white/[0.06]" />
          <Skeleton className="h-12 w-full bg-black/5 dark:bg-white/[0.06]" />
          <Skeleton className="h-12 w-full bg-black/5 dark:bg-white/[0.06]" />
          <Skeleton className="mt-6 h-10 w-20 bg-black/5 dark:bg-white/[0.06]" />
          <Skeleton className="h-12 w-full bg-black/5 dark:bg-white/[0.06]" />
          <Skeleton className="h-12 w-full bg-black/5 dark:bg-white/[0.06]" />
        </div>
      </aside>

      <div className="lg:pl-[296px]">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur md:px-6 lg:px-8 dark:border-white/[0.06] dark:bg-[#0B0F14]/90">
          <div className="flex h-10 items-center justify-between">
            <Skeleton className="h-4 w-72 bg-black/5 dark:bg-white/[0.06]" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/[0.06]" />
              <Skeleton className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/[0.06]" />
              <Skeleton className="h-10 w-10 rounded-xl bg-black/5 dark:bg-white/[0.06]" />
              <Skeleton className="h-10 w-44 rounded-2xl bg-black/5 dark:bg-white/[0.06]" />
            </div>
          </div>
        </header>

        <main className="space-y-6 px-4 py-6 md:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <Skeleton className="h-7 w-40 bg-black/5 dark:bg-white/[0.06]" />
              <Skeleton className="h-4 w-56 bg-black/5 dark:bg-white/[0.06]" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-11 w-36 rounded-xl bg-black/5 dark:bg-white/[0.06]" />
              <Skeleton className="h-11 w-40 rounded-xl bg-black/5 dark:bg-white/[0.06]" />
              <Skeleton className="h-11 w-36 rounded-xl bg-black/5 dark:bg-white/[0.06]" />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/[0.06] dark:bg-[#111827]"
              >
                <Skeleton className="h-3 w-28 bg-black/5 dark:bg-white/[0.06]" />
                <Skeleton className="mt-5 h-8 w-32 bg-black/5 dark:bg-white/[0.06]" />
                <Skeleton className="mt-5 h-10 w-full rounded-xl bg-black/5 dark:bg-white/[0.06]" />
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Skeleton className="h-[320px] rounded-2xl bg-black/5 dark:bg-white/[0.06]" />
            <Skeleton className="h-[320px] rounded-2xl bg-black/5 dark:bg-white/[0.06]" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Skeleton className="h-[380px] rounded-2xl bg-black/5 dark:bg-white/[0.06]" />
            <Skeleton className="h-[380px] rounded-2xl bg-black/5 dark:bg-white/[0.06]" />
          </div>
        </main>
      </div>
    </div>
  );
}
