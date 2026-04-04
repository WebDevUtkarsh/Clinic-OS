CREATE TYPE "AppointmentStatus" AS ENUM ('BOOKED', 'CANCELLED', 'COMPLETED');

CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Appointment_facilityId_startTime_idx" ON "Appointment"("facilityId", "startTime");
CREATE INDEX "Appointment_doctorId_startTime_idx" ON "Appointment"("doctorId", "startTime");
CREATE INDEX "Appointment_facilityId_status_startTime_idx" ON "Appointment"("facilityId", "status", "startTime");
CREATE INDEX "Appointment_doctorId_status_startTime_idx" ON "Appointment"("doctorId", "status", "startTime");
CREATE UNIQUE INDEX "Appointment_doctorId_startTime_booked_key"
  ON "Appointment"("doctorId", "startTime")
  WHERE "status" = 'BOOKED';

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "key", "createdAt")
VALUES
  ('perm_appointments_read', 'appointments:read', CURRENT_TIMESTAMP),
  ('perm_appointments_create', 'appointments:create', CURRENT_TIMESTAMP),
  ('perm_appointments_update', 'appointments:update', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT
  'rp_' || replace(gen_random_uuid()::text, '-', ''),
  owner_role."id",
  permission."id"
FROM "roles" AS owner_role
CROSS JOIN "permissions" AS permission
WHERE owner_role."name" = 'OWNER'
  AND permission."key" IN ('appointments:read', 'appointments:create', 'appointments:update')
  AND NOT EXISTS (
    SELECT 1
    FROM "role_permissions" existing
    WHERE existing."roleId" = owner_role."id"
      AND existing."permissionId" = permission."id"
  );
