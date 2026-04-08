"use client";

import { useMemo, useState } from "react";
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Award, 
  Stethoscope,
  Send,
  Plus,
  ArrowLeft,
  Loader2,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDoctor, useSendDoctorInvite, useAssignDoctorFacilities } from "@/features/doctors/api";
import { deriveDoctorStatus, type DoctorStatus } from "../types";
import { cn } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";
import { useFacilities } from "@/features/facilities/api";
import { Can } from "@/hooks/use-can";

type DoctorDetailClientProps = {
  doctorId: string;
  facilityId: string;
};

const STATUS_STYLES: Record<DoctorStatus, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  INVITED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  NOT_INVITED: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  DISABLED: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function DoctorDetailClient({ doctorId, facilityId }: DoctorDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "facilities" | "schedule">("overview");
  const [isManageFacilitiesOpen, setIsManageFacilitiesOpen] = useState(false);
  
  const { data: doctor, isLoading, isError } = useDoctor(doctorId);
  const { data: allFacilities } = useFacilities();
  
  const inviteMutation = useSendDoctorInvite();
  const assignMutation = useAssignDoctorFacilities();

  const status = doctor ? deriveDoctorStatus(doctor) : "NOT_INVITED";

  const handleSendInvite = async () => {
    if (!doctor) return;
    try {
        await inviteMutation.mutateAsync(doctor.id);
        alert("Invite sent successfully!");
    } catch {
        alert("Failed to send invite.");
    }
  };

  const handleRemoveFacility = async (fId: string) => {
    if (!doctor || doctor.facilities.length <= 1) {
        alert("A doctor must be assigned to at least one facility.");
        return;
    }
    if (confirm("Are you sure you want to remove this doctor from this facility?")) {
        await assignMutation.mutateAsync({
            id: doctor.id,
            payload: { assign: [], remove: [fId] }
        });
    }
  };

  const handleManageFacilitiesSave = async (selectedFacilityIds: string[]) => {
    if (!doctor) return;
    try {
      const currentIds = new Set(doctor.facilities.map((f) => f.id));
      const nextIds = new Set(selectedFacilityIds);

      const toAdd = selectedFacilityIds.filter((id) => !currentIds.has(id));
      const toRemove = doctor.facilities.map((f) => f.id).filter((id) => !nextIds.has(id));

      await assignMutation.mutateAsync({
        id: doctor.id,
        payload: {
          assign: toAdd.map((facilityId) => ({
            facilityId,
            consultationFee: 0,
            consultationDuration: 15,
            consultationStartTime: "09:00",
            consultationEndTime: "17:00",
          })),
          remove: toRemove,
        },
      });

      setIsManageFacilitiesOpen(false);
    } catch {
      alert("Failed to update facilities.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-100 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError || !doctor) {
    return (
      <div className="flex h-100 flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Doctor not found or an error occurred.</p>
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const fullName = [doctor.salutation, doctor.firstName, doctor.lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-6 animate-auth-flow">
      {/* Header Profile Section */}
      <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/8 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="h-24 w-24 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 text-3xl font-bold">
            {doctor.firstName[0]}{doctor.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-[#F9FAFB] truncate">
                {fullName}
              </h1>
              <span className={cn("border px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider", STATUS_STYLES[status])}>
                {status.replace("_", " ")}
              </span>
            </div>
            <p className="text-gray-500 dark:text-[#9CA3AF] flex items-center gap-2 mb-4">
              <Stethoscope size={16} />
              {doctor.specialization || "General Physician"}
            </p>
            
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-[#9CA3AF]">
                <Mail size={14} className="text-gray-400" />
                {doctor.email}
              </div>
              {doctor.phone && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-[#9CA3AF]">
                  <Phone size={14} className="text-gray-400" />
                  {doctor.phone}
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600 dark:text-[#9CA3AF]">
                <Award size={14} className="text-gray-400" />
                {doctor.yearsOfExperience || 0} years exp.
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto">
            {status === "NOT_INVITED" && (
                <Button onClick={handleSendInvite} className="gap-2" disabled={inviteMutation.isPending}>
                    {inviteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Send System Invite
                </Button>
            )}
            <Button variant="outline">Edit Profile</Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-1 p-1 bg-gray-100/50 dark:bg-white/2 rounded-xl border border-gray-200 dark:border-white/4 w-fit">
        {(['overview', 'facilities', 'schedule'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all",
              activeTab === tab 
                ? "bg-white dark:bg-[#111827] text-blue-500 shadow-sm" 
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-100">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/8 rounded-2xl p-6">
              <h3 className="text-sm font-semibold mb-4 text-gray-500 uppercase tracking-wider">Professional Credentials</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">License Number</label>
                  <p className="text-sm border-b border-gray-50 dark:border-white/2 pb-2 font-medium">{doctor.licenseNumber || "Not recorded"}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Medical Council</label>
                  <p className="text-sm border-b border-gray-50 dark:border-white/2 pb-2 font-medium">{doctor.councilName || "Not recorded"}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/8 rounded-2xl p-6">
              <h3 className="text-sm font-semibold mb-4 text-gray-500 uppercase tracking-wider">Contact & Address</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{doctor.address || "No address provided"}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {[doctor.city, doctor.state, doctor.postalCode].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Joined Platform</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(doctor.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "facilities" && (
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/8 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-white/4 flex items-center justify-between">
              <h3 className="font-semibold">Facility Assignments</h3>
              <Can permission="doctors:update">
                  <Button size="sm" onClick={() => setIsManageFacilitiesOpen(true)} className="gap-2 h-8 text-xs">
                    <Plus size={14} /> Manage Facilities
                  </Button>
              </Can>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/4">
              {doctor.facilities.map((df) => (
                <div key={df.mappingId} className="p-6 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/1 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-white/4 flex items-center justify-center text-gray-500">
                        <Building2 size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{df.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{df.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Consultation Fee</p>
                      <p className="text-sm font-medium">₹{df.consultationFee || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Duration</p>
                      <p className="text-sm font-medium">{df.consultationDuration || 15} mins</p>
                    </div>
                    <Can permission="doctors:update">
                        <button 
                            onClick={() => handleRemoveFacility(df.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Remove from facility"
                        >
                          <Trash2 size={16} />
                        </button>
                    </Can>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/8 rounded-2xl p-20 text-center animate-in fade-in duration-300">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 mx-auto mb-4">
              <Calendar size={32} />
            </div>
            <h3 className="font-semibold mb-2">Scheduling Module Integration</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Weekly availability and time-slot management will be available here once the Appointments module is phased in.
            </p>
          </div>
        )}
      </div>

      {isManageFacilitiesOpen && (
        <ManageFacilitiesModal 
            onClose={() => setIsManageFacilitiesOpen(false)} 
            facilities={allFacilities || []} 
            assignedFacilityIds={doctor.facilities.map(f => f.id)} 
            onSave={handleManageFacilitiesSave} 
            isSaving={assignMutation.isPending}
        />
      )}
    </div>
  );
}

function ManageFacilitiesModal({ 
    onClose, 
    facilities, 
    assignedFacilityIds, 
    onSave,
    isSaving
}: { 
    onClose: () => void, 
    facilities: Array<{ id: string, name: string }>, 
    assignedFacilityIds: string[], 
    onSave: (ids: string[]) => void,
    isSaving: boolean
}) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(assignedFacilityIds));

    const toggle = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/8 w-full max-w-md rounded-2xl shadow-2xl p-6 relative flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-semibold mb-2">Manage Facilities</h2>
                <p className="text-sm text-gray-500 mb-4">Select which facilities this doctor should be assigned to.</p>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 mb-6 border border-gray-100 rounded-lg p-2 dark:border-white/5">
                    {facilities.map(f => (
                        <label key={f.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-white/2 rounded-lg cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={selectedIds.has(f.id)} 
                                onChange={() => toggle(f.id)}
                                className="h-4 w-4 rounded border-gray-300 accent-blue-500" 
                            />
                            <span className="text-sm font-medium">{f.name}</span>
                        </label>
                    ))}
                    {facilities.length === 0 && <p className="text-sm text-gray-500 p-2">No facilities available.</p>}
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/6">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={() => onSave(Array.from(selectedIds))} disabled={isSaving}>
                        {isSaving && <Loader2 size={16} className="animate-spin mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}
