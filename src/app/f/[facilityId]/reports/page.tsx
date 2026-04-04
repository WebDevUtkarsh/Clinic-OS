import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";

type ReportsRoutePageProps = {
  params: Promise<{ facilityId: string }>;
};

export default async function ReportsRoutePage({
  params,
}: ReportsRoutePageProps) {
  const { facilityId } = await params;

  return (
    <ModulePlaceholder
      facilityId={facilityId}
      title="Reports"
      description="Facility performance, patient throughput, and financial analytics will live here."
    />
  );
}
