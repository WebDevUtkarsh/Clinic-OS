import { ArrowRight, FolderKanban } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  facilityId: string;
};

export function ModulePlaceholder({
  title,
  description,
  facilityId,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#F9FAFB]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
          {description}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-white/[0.06] dark:bg-[#111827]">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
          <FolderKanban className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-gray-900 dark:text-[#F9FAFB]">
          {title} workspace
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-[#6B7280]">
          This area is now routed through the redesigned Clinic OS shell, so
          any future data tables, forms, and analytics here will inherit the
          facility-safe navigation, insights drawer, and theme-aware dashboard
          styling automatically.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/f/${facilityId}/dashboard`}>
              Return to dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            className="border-gray-200 bg-white dark:border-white/[0.08] dark:bg-[#111827]"
          >
            Module configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
