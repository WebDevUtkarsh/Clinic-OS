import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PatientDetailClient } from "@/features/patients/components/patient-detail-client";

export default async function PatientDetailsPage({ 
  params 
}: { 
  params: Promise<{ facilityId: string; id: string }> 
}) {
  const { facilityId, id } = await params;

  return (
    <div className="flex flex-col h-full animate-auth-flow">
      <div className="px-4 py-6 md:px-8 border-b border-border">
        <div className="mb-4">
          <Link 
            href={`/f/${facilityId}/patients`}
            className="inline-flex items-center text-sm font-medium text-text-secondary hover:text-foreground transition-colors"
          >
            <ChevronLeft size={16} className="mr-1" /> Back to Patients
          </Link>
        </div>
        <PatientDetailClient facilityId={facilityId} patientId={id} />
      </div>

      <div className="flex-1 bg-muted/10 p-4 md:p-8">
        {/* Placeholder for future-ready Tabs implementation */}
        <div className="max-w-4xl mx-auto text-center border-2 border-dashed border-border/50 rounded-xl p-16">
          <h3 className="text-xl font-medium text-foreground">Clinical Records System</h3>
          <p className="mt-2 text-text-secondary max-w-md mx-auto">
            The EHR (Electronic Health Record) views — encapsulating Vitals, Medications, and Past Encounters — will be built in the next module.
          </p>
        </div>
      </div>
    </div>
  );
}
