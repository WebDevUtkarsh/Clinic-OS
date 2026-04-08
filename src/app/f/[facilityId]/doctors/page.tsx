import { DoctorsPageClient } from "@/features/doctors/components/doctors-page-client";

type DoctorsRoutePageProps = {
  params: Promise<{ facilityId: string }>;
};

export default async function DoctorsRoutePage({
  params,
}: DoctorsRoutePageProps) {
  const { facilityId } = await params;

  return <DoctorsPageClient facilityId={facilityId} />;
}
