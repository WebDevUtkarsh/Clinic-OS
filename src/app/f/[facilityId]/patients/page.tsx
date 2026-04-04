import { PatientsPage } from "@/features/patients/components/patients-page";

type PatientsRoutePageProps = {
  params: Promise<{ facilityId: string }>;
};

export default async function PatientsRoutePage({
  params,
}: PatientsRoutePageProps) {
  const { facilityId } = await params;
  return <PatientsPage facilityId={facilityId} />;
}
