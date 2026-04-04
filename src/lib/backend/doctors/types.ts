import type { FacilityType } from "@/generated/tenant/enums";

export type DoctorFacilityResponse = {
  id: string;
  facilityId: string;
  organizationId: string;
  consultationFee: number | null;
  consultationDuration: number | null;
  consultationStartTime: string | null;
  consultationEndTime: string | null;
  createdAt: string;
  facility: {
    id: string;
    organizationId: string;
    name: string;
    type: FacilityType;
  };
};

export type DoctorResponse = {
  id: string;
  userId: string | null;
  salutation: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  licenseNumber: string | null;
  councilName: string | null;
  yearsOfExperience: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  facilities: DoctorFacilityResponse[];
};

export type DoctorListItemResponse = DoctorResponse & {
  currentFacility: DoctorFacilityResponse | null;
};
