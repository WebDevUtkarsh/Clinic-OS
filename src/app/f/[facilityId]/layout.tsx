import { DashboardShell } from "@/components/layout/DashboardShell";
import { requireFacilitySession } from "@/features/auth/server";
import { getTenantPrisma } from "@/lib/backend/prisma/tenant";

type FacilityLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ facilityId: string }>;
};

export default async function FacilityLayout({
  children,
  params,
}: FacilityLayoutProps) {
  const { facilityId } = await params;
  const session = await requireFacilitySession(facilityId);
  const prisma = await getTenantPrisma(session.tenant.id);
  const accessibleFacilities = await prisma.facility.findMany({
    where: {
      id: {
        in: session.accessibleFacilityIds,
      },
    },
    select: {
      id: true,
      name: true,
      organization: {
        select: {
          name: true,
        },
      },
    },
  });
  const facilitiesById = new Map(
    accessibleFacilities.map((facility) => [
      facility.id,
      {
        id: facility.id,
        name: facility.name,
        organizationName: facility.organization.name,
      },
    ]),
  );
  const facilities = session.accessibleFacilityIds
    .map((id) => facilitiesById.get(id))
    .filter((facility): facility is NonNullable<typeof facility> => Boolean(facility));

  return (
    <DashboardShell facilityId={facilityId} facilities={facilities} session={session}>
      {children}
    </DashboardShell>
  );
}
