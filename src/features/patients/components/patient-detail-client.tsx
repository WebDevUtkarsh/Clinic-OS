"use client";

import { usePatient } from "@/features/patients/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, MapPin, Phone } from "lucide-react";

export function PatientDetailClient({ facilityId, patientId }: { facilityId: string; patientId: string }) {
  const { data: patient, isLoading, error } = usePatient(patientId);

  if (isLoading) {
    return (
      <div className="flex items-start gap-6">
        <Skeleton className="h-24 w-24 rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return <div className="text-danger mt-4 font-medium">Failed to load patient details. Ensure you have the proper access permissions.</div>;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      <div className="h-24 w-24 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-3xl shadow-xs shrink-0 border border-primary/20">
        {patient.name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
          {patient.name}
          <Badge variant={patient.gender === "Female" ? "default" : "secondary"}>{patient.gender}</Badge>
        </h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Phone size={16} className="text-muted-foreground" />
            {patient.phone || "No phone recorded"}
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Mail size={16} className="text-muted-foreground" />
            {patient.email || "No email listed"}
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Calendar size={16} className="text-muted-foreground" />
            {patient.dob ? new Date(patient.dob).toLocaleDateString() : "DOB unknown"}
          </div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <MapPin size={16} className="text-muted-foreground" />
            <span className="truncate">{patient.address || "Address not provided"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
