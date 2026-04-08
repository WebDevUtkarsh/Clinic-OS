import { DoctorDetailClient } from "@/features/doctors/components/doctor-detail-client";

type DoctorRoutePageProps = {
  params: Promise<{ facilityId: string; id: string }>;
};

export default async function DoctorRoutePage({
  params,
}: DoctorRoutePageProps) {
  const { facilityId, id } = await params;

  return <DoctorDetailClient doctorId={id} facilityId={facilityId} />;
}
