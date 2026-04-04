CREATE TABLE "DoctorInvite" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DoctorInvite_tokenHash_key" ON "DoctorInvite"("tokenHash");
CREATE INDEX "DoctorInvite_doctorId_idx" ON "DoctorInvite"("doctorId");
CREATE INDEX "DoctorInvite_email_idx" ON "DoctorInvite"("email");
CREATE INDEX "DoctorInvite_expiresAt_idx" ON "DoctorInvite"("expiresAt");

ALTER TABLE "DoctorInvite" ADD CONSTRAINT "DoctorInvite_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "roles" ("id", "name", "createdAt")
SELECT
  'role_doctor_' || replace(gen_random_uuid()::text, '-', ''),
  'DOCTOR',
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM "roles"
  WHERE "name" = 'DOCTOR'
);
