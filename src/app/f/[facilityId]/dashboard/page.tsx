import { DashboardPageContent } from "@/components/dashboard/DashboardPageContent";
import { requireFacilitySession } from "@/features/auth/server";

type DashboardPageProps = {
  params: Promise<{ facilityId: string }>;
  searchParams: Promise<{ welcome?: string }>;
};

export default async function DashboardPage({
  params,
  searchParams,
}: DashboardPageProps) {
  const { facilityId } = await params;
  const { welcome } = await searchParams;
  const session = await requireFacilitySession(facilityId);

  return (
    <DashboardPageContent
      userName={session.user.name}
      welcome={welcome === "1"}
    />
  );
}
