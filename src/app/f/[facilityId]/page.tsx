import { redirect } from "next/navigation";

type FacilityIndexPageProps = {
  params: Promise<{ facilityId: string }>;
};

export default async function FacilityIndexPage({
  params,
}: FacilityIndexPageProps) {
  const { facilityId } = await params;
  redirect(`/f/${facilityId}/dashboard`);
}
