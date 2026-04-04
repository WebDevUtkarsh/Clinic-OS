export type AppointmentResponse = {
  id: string;
  patientId: string;
  doctorId: string;
  facilityId: string;
  startTime: string;
  endTime: string;
  status: "BOOKED" | "CANCELLED" | "COMPLETED";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: string;
    name: string;
  };
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
  };
};

export type AppointmentSlotResponse = {
  startTime: string;
  endTime: string;
};
