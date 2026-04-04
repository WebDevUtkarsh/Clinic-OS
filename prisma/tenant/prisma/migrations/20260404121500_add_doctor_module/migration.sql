CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "salutation" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "specialization" TEXT,
    "licenseNumber" TEXT,
    "councilName" TEXT,
    "yearsOfExperience" INTEGER,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DoctorFacility" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "consultationFee" DOUBLE PRECISION,
    "consultationDuration" INTEGER,
    "consultationStartTime" TEXT,
    "consultationEndTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorFacility_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Doctor_email_key" ON "Doctor"("email");
CREATE INDEX "Doctor_isActive_idx" ON "Doctor"("isActive");
CREATE INDEX "Doctor_createdAt_idx" ON "Doctor"("createdAt");
CREATE INDEX "Doctor_lastName_firstName_idx" ON "Doctor"("lastName", "firstName");
CREATE INDEX "Doctor_specialization_idx" ON "Doctor"("specialization");

CREATE UNIQUE INDEX "DoctorFacility_doctorId_facilityId_key" ON "DoctorFacility"("doctorId", "facilityId");
CREATE INDEX "DoctorFacility_doctorId_idx" ON "DoctorFacility"("doctorId");
CREATE INDEX "DoctorFacility_facilityId_idx" ON "DoctorFacility"("facilityId");
CREATE INDEX "DoctorFacility_organizationId_idx" ON "DoctorFacility"("organizationId");

ALTER TABLE "DoctorFacility" ADD CONSTRAINT "DoctorFacility_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DoctorFacility" ADD CONSTRAINT "DoctorFacility_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "key", "createdAt")
VALUES
  ('perm_doctors_read', 'doctors:read', CURRENT_TIMESTAMP),
  ('perm_doctors_create', 'doctors:create', CURRENT_TIMESTAMP),
  ('perm_doctors_update', 'doctors:update', CURRENT_TIMESTAMP),
  ('perm_doctors_delete', 'doctors:delete', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT
  'rp_' || replace(gen_random_uuid()::text, '-', ''),
  owner_role."id",
  permission."id"
FROM "roles" AS owner_role
CROSS JOIN "permissions" AS permission
WHERE owner_role."name" = 'OWNER'
  AND permission."key" IN ('doctors:read', 'doctors:create', 'doctors:update', 'doctors:delete')
  AND NOT EXISTS (
    SELECT 1
    FROM "role_permissions" existing
    WHERE existing."roleId" = owner_role."id"
      AND existing."permissionId" = permission."id"
  );
