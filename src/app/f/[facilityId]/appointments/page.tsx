import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";

type AppointmentsRoutePageProps = {
  params: Promise<{ facilityId: string }>;
};

export default async function AppointmentsRoutePage({
  params,
}: AppointmentsRoutePageProps) {
  const { facilityId } = await params;

  return (
    <ModulePlaceholder
      facilityId={facilityId}
      title="Appointments"
      description="Scheduling operations, queue management, and clinician calendar controls will live here."
    />
  );
}
