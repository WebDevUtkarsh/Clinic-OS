import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder";

type BillingRoutePageProps = {
  params: Promise<{ facilityId: string }>;
};

export default async function BillingRoutePage({
  params,
}: BillingRoutePageProps) {
  const { facilityId } = await params;

  return (
    <ModulePlaceholder
      facilityId={facilityId}
      title="Billing"
      description="Revenue collection, pending claims, and ledger review will live here."
    />
  );
}
