import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";

type DoctorsRoutePageProps = {
  params: Promise<{ facilityId: string }>;
};

export default async function DoctorsRoutePage({
  params,
}: DoctorsRoutePageProps) {
  const { facilityId } = await params;

  return (
    <ModulePlaceholder
      facilityId={facilityId}
      title="Doctors"
      description="Roster management, provider availability, and specialty performance will live here."
    />
  );
}
