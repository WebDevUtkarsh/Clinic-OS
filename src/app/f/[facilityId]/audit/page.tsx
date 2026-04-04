import { AuditPage } from "@/features/audit/components/audit-page";

type AuditRoutePageProps = {
  params: Promise<{ facilityId: string }>;
};

export default async function AuditRoutePage({ params }: AuditRoutePageProps) {
  const { facilityId } = await params;
  return <AuditPage facilityId={facilityId} />;
}
