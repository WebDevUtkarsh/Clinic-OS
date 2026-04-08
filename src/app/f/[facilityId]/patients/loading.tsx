import { Skeleton } from "@/components/ui/skeleton";

export default function PatientsLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="px-4 py-6 md:px-8">
        <div className="mb-8">
          <Skeleton className="h-9 w-64 mb-4" />
          <Skeleton className="h-5 w-96" />
        </div>
        
        <div className="flex items-center justify-between py-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="rounded-md border border-white/[0.06] flex-1 overflow-hidden">
          <div className="h-12 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/[0.06]" />
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="flex h-16 items-center px-4 border-b border-gray-200 dark:border-white/[0.04]">
              <Skeleton className="h-4 w-4 rounded mr-4" />
              <div className="flex-1 flex gap-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
