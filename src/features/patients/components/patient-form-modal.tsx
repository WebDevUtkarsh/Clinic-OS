import { useEffect, useState } from "react";
import { Plus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreatePatient, useUpdatePatient } from "@/features/patients/api";
import { type Patient, createPatientSchema, type CreatePatientPayload } from "@/features/patients/types";
import { z } from "zod";
import { ApiClientError } from "@/lib/api/client";

/** Convert empty strings to undefined, trim strings, convert date to ISO datetime */
function sanitizePayload(data: CreatePatientPayload): CreatePatientPayload {
  const trimOrUndefined = (val?: string) => {
    const trimmed = val?.trim();
    return trimmed || undefined;
  };

  return {
    name: data.name.trim(),
    gender: data.gender,
    dob: data.dob?.trim()
      ? new Date(data.dob.trim()).toISOString()
      : undefined,
    phone: trimOrUndefined(data.phone),
    email: trimOrUndefined(data.email),
    address: trimOrUndefined(data.address),
  };
}

type PatientFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  patientToEdit?: Patient | null;
};

export function PatientFormModal({ isOpen, onClose, patientToEdit }: PatientFormModalProps) {
  const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient();

  const [formData, setFormData] = useState<CreatePatientPayload>({
    name: "",
    gender: "Other",
    dob: "",
    phone: "",
    email: "",
    address: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (patientToEdit) {
        setFormData({
          name: patientToEdit.name,
          gender: patientToEdit.gender,
          dob: patientToEdit.dob ? new Date(patientToEdit.dob).toISOString().split('T')[0] : "",
          phone: patientToEdit.phone || "",
          email: patientToEdit.email || "",
          address: patientToEdit.address || "",
        });
      } else {
        setFormData({
          name: "",
          gender: "Other",
          dob: "",
          phone: "",
          email: "",
          address: "",
        });
      }
      setErrors({});
    }
  }, [isOpen, patientToEdit]);

  if (!isOpen) return null;

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsed = createPatientSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((err: z.ZodIssue) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const payload = sanitizePayload(parsed.data);
    console.log("[PatientForm] Sending payload:", payload);

    try {
      if (patientToEdit) {
        await updateMutation.mutateAsync({ id: patientToEdit.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        console.error("[PatientForm] Backend error:", err.message, err.status);
        setErrors({ form: err.message });
      } else if (err instanceof Error) {
        console.error("[PatientForm] Error:", err.message);
        setErrors({ form: err.message });
      } else {
        setErrors({ form: "Failed to save patient. They may already exist." });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] w-full max-w-lg rounded-2xl shadow-2xl p-6 relative flex flex-col max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-secondary hover:text-foreground hover:bg-muted rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Plus className="text-primary h-5 w-5" />
          {patientToEdit ? "Edit Patient Details" : "Register New Patient"}
        </h2>

        {errors.form && (
          <div className="p-3 mb-4 bg-danger/10 border border-danger/20 text-danger rounded-lg text-sm font-medium">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Full Name</label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="John Doe"
              className={errors.name ? "border-danger" : ""}
            />
            {errors.name && <p className="text-danger text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Gender</label>
              <select 
                value={formData.gender}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as CreatePatientPayload["gender"] }))}
                className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Date of Birth</label>
              <Input 
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                className={errors.dob ? "border-danger" : ""}
              />
              {errors.dob && <p className="text-danger text-xs mt-1">{errors.dob}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Phone Number</label>
              <Input 
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Email Address</label>
              <Input 
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="patient@example.com"
                className={errors.email ? "border-danger" : ""}
              />
              {errors.email && <p className="text-danger text-xs mt-1">{errors.email}</p>}
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-text-secondary mb-1">Home Address</label>
             <Input 
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Care Ave, Healthcare City"
              />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-6">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              {patientToEdit ? "Save Changes" : "Create Patient"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
