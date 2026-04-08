"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateDoctor, useUpdateDoctor } from "@/features/doctors/api";
import { useFacilities } from "@/features/facilities/api";
import {
  type Doctor,
  createDoctorSchema,
  type CreateDoctorPayload,
  type DoctorListItem,
} from "../types";
import { z } from "zod";
import { ApiClientError } from "@/lib/api/client";

type DoctorFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  doctorToEdit?: DoctorListItem | null;
  facilityId: string;
};

/** Convert empty strings to undefined or null appropriately */
function sanitizePayload(data: CreateDoctorPayload): CreateDoctorPayload {
  const trimOrUndefined = (val?: string | null) => {
    const trimmed = val?.trim();
    return trimmed === "" ? undefined : trimmed;
  };

  return {
    ...data,
    salutation: trimOrUndefined(data.salutation),
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    phone: trimOrUndefined(data.phone),
    specialization: trimOrUndefined(data.specialization),
    licenseNumber: trimOrUndefined(data.licenseNumber),
    councilName: trimOrUndefined(data.councilName),
    address: trimOrUndefined(data.address),
    city: trimOrUndefined(data.city),
    state: trimOrUndefined(data.state),
    postalCode: trimOrUndefined(data.postalCode),
    facilities: data.facilities.map((f) => ({
      ...f,
      consultationStartTime: trimOrUndefined(f.consultationStartTime),
      consultationEndTime: trimOrUndefined(f.consultationEndTime),
    })),
  };
}

export function DoctorFormModal({ isOpen, onClose, doctorToEdit, facilityId }: DoctorFormModalProps) {
  const createMutation = useCreateDoctor();
  const updateMutation = useUpdateDoctor();
  const { data: allFacilities, isLoading: isLoadingFacilities } = useFacilities();

  const [formData, setFormData] = useState<CreateDoctorPayload>({
    firstName: "",
    lastName: "",
    email: "",
    salutation: "Dr.",
    specialization: "",
    licenseNumber: "",
    councilName: "",
    yearsOfExperience: 0,
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    facilities: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (doctorToEdit) {
        setFormData({
          salutation: doctorToEdit.salutation || "Dr.",
          firstName: doctorToEdit.firstName,
          lastName: doctorToEdit.lastName,
          email: doctorToEdit.email,
          phone: doctorToEdit.phone || "",
          specialization: doctorToEdit.specialization || "",
          licenseNumber: doctorToEdit.licenseNumber || "",
          councilName: doctorToEdit.councilName || "",
          yearsOfExperience: doctorToEdit.yearsOfExperience || 0,
          address: doctorToEdit.address || "",
          city: doctorToEdit.city || "",
          state: doctorToEdit.state || "",
          postalCode: doctorToEdit.postalCode || "",
          facilities: doctorToEdit.facilities.map((f) => ({
            facilityId: f.id,
            consultationFee: f.consultationFee,
            consultationDuration: f.consultationDuration,
            consultationStartTime: f.consultationStartTime || "",
            consultationEndTime: f.consultationEndTime || "",
          })),
        });
      } else {
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          salutation: "Dr.",
          specialization: "",
          licenseNumber: "",
          councilName: "",
          yearsOfExperience: 0,
          phone: "",
          address: "",
          city: "",
          state: "",
          postalCode: "",
          // Automatically add current facility
          facilities: [{ 
              facilityId, 
              consultationFee: 500, 
              consultationDuration: 15,
              consultationStartTime: "09:00",
              consultationEndTime: "17:00"
          }],
        });
      }
      setErrors({});
    }
  }, [isOpen, doctorToEdit, facilityId]);

  if (!isOpen) return null;

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsed = createDoctorSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((err: z.ZodIssue) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const payload = sanitizePayload(parsed.data);

    try {
      if (doctorToEdit) {
        // Update basic info - backend update schema doesn't include facilities
        const { facilities, ...basicInfo } = payload;
        await updateMutation.mutateAsync({ id: doctorToEdit.id, payload: basicInfo });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrors({ form: err.message });
      } else {
        setErrors({ form: "Failed to save doctor details." });
      }
    }
  };

  const addFacility = (fId: string) => {
    if (formData.facilities.some(f => f.facilityId === fId)) return;
    setFormData(prev => ({
      ...prev,
      facilities: [...prev.facilities, { 
          facilityId: fId, 
          consultationFee: 0, 
          consultationDuration: 15,
          consultationStartTime: "09:00",
          consultationEndTime: "17:00"
      }]
    }));
  };

  const removeFacility = (fId: string) => {
    setFormData(prev => ({
      ...prev,
      facilities: prev.facilities.filter(f => f.facilityId !== fId)
    }));
  };

  const updateFacilityConfig = (fId: string, updates: Partial<CreateDoctorPayload["facilities"][0]>) => {
    setFormData(prev => ({
      ...prev,
      facilities: prev.facilities.map(f => f.facilityId === fId ? { ...f, ...updates } : f)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          {doctorToEdit ? "Edit Doctor Profile" : "Register New Doctor"}
        </h2>

        {errors.form && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm font-medium">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-2">
          {/* Section: Personal Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-blue-500 uppercase tracking-wider">Basic Information</h3>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-[#9CA3AF] mb-1">Title</label>
                <select 
                  value={formData.salutation || ""}
                  onChange={(e) => setFormData(p => ({ ...p, salutation: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/[0.08]"
                >
                  <option value="Dr.">Dr.</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Prof.">Prof.</option>
                </select>
              </div>
              <div className="col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-[#9CA3AF] mb-1">First Name</label>
                <Input 
                  value={formData.firstName}
                  onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
                  placeholder="Jane"
                  required
                />
              </div>
              <div className="col-span-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-[#9CA3AF] mb-1">Last Name</label>
                <Input 
                  value={formData.lastName}
                  onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
                  placeholder="Smith"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#9CA3AF] mb-1">Email Address</label>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  placeholder="jane.smith@example.com"
                  required
                  disabled={!!doctorToEdit}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#9CA3AF] mb-1">Phone Number</label>
                <Input 
                  value={formData.phone || ""}
                  onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>
          </div>

          {/* Section: Professional Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-blue-500 uppercase tracking-wider">Professional Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#9CA3AF] mb-1">Specialization</label>
                <Input 
                  value={formData.specialization || ""}
                  onChange={(e) => setFormData(p => ({ ...p, specialization: e.target.value }))}
                  placeholder="Cardiologist"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#9CA3AF] mb-1">License/Registration #</label>
                <Input 
                  value={formData.licenseNumber || ""}
                  onChange={(e) => setFormData(p => ({ ...p, licenseNumber: e.target.value }))}
                  placeholder="REG123456"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#9CA3AF] mb-1">Medical Council</label>
                <Input 
                  value={formData.councilName || ""}
                  onChange={(e) => setFormData(p => ({ ...p, councilName: e.target.value }))}
                  placeholder="State Medical Council"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#9CA3AF] mb-1">Years of Experience</label>
                <Input 
                  type="number"
                  value={formData.yearsOfExperience || 0}
                  onChange={(e) => setFormData(p => ({ ...p, yearsOfExperience: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>

          {/* Section: Facility Assignment */}
          {!doctorToEdit && (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-blue-500 uppercase tracking-wider">Facility Assignments</h3>
                    <select 
                        className="text-xs rounded-lg border border-gray-200 bg-transparent px-2 py-1 outline-none dark:border-white/[0.08]"
                        onChange={(e) => {
                            if (e.target.value) addFacility(e.target.value);
                            e.target.value = "";
                        }}
                        defaultValue=""
                    >
                        <option value="" disabled>Add Facility...</option>
                        {allFacilities?.map(f => (
                            <option key={f.id} value={f.id} disabled={formData.facilities.some(x => x.facilityId === f.id)}>
                                {f.name}
                            </option>
                        ))}
                    </select>
                </div>
                
                <div className="space-y-3">
                    {formData.facilities.map((fSetting, idx) => {
                        const facility = allFacilities?.find(x => x.id === fSetting.facilityId);
                        return (
                            <div key={fSetting.facilityId} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-white/[0.04] dark:bg-white/[0.02]">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold">{facility?.name || "Loading..."}</span>
                                    {formData.facilities.length > 1 && (
                                        <button 
                                            type="button" 
                                            onClick={() => removeFacility(fSetting.facilityId)}
                                            className="text-red-500 hover:text-red-600 p-1"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Fee (₹)</label>
                                        <Input 
                                            type="number" 
                                            value={fSetting.consultationFee || 0}
                                            onChange={(e) => updateFacilityConfig(fSetting.facilityId, { consultationFee: parseInt(e.target.value) || 0 })}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase font-semibold text-gray-500 mb-1">Duration (min)</label>
                                        <Input 
                                            type="number" 
                                            value={fSetting.consultationDuration || 15}
                                            onChange={(e) => updateFacilityConfig(fSetting.facilityId, { consultationDuration: parseInt(e.target.value) || 15 })}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-white/[0.06] mt-6">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              {doctorToEdit ? "Save Changes" : "Register Doctor"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
