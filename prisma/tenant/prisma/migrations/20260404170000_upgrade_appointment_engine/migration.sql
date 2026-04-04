ALTER TABLE "DoctorFacility"
  ADD COLUMN "bufferBefore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "bufferAfter" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "DoctorSchedule" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorSchedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DoctorSchedule_doctorId_facilityId_dayOfWeek_idx"
  ON "DoctorSchedule"("doctorId", "facilityId", "dayOfWeek");
CREATE INDEX "DoctorSchedule_facilityId_dayOfWeek_idx"
  ON "DoctorSchedule"("facilityId", "dayOfWeek");

ALTER TABLE "DoctorSchedule" ADD CONSTRAINT "DoctorSchedule_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DoctorSchedule" ADD CONSTRAINT "DoctorSchedule_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
