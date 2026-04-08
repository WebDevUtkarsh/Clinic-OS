import { PatientsPageClient } from "@/features/patients/components/patients-page-client";

export default async function PatientsPage({ params }: { params: Promise<{ facilityId: string }> }) {
  // Extract facilityId from params correctly
  const { facilityId } = await params;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="px-4 py-6 md:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Patients Registry</h1>
          <p className="mt-2 font-medium text-text-secondary">
            Manage your facility&apos;s holistic patient database.
          </p>
        </div>
        
        <PatientsPageClient facilityId={facilityId} />
      </div>
    </div>
  );
}
