-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_email_key" ON "Doctor"("email");

-- CreateIndex
CREATE INDEX "DoctorFacility_facilityId_idx" ON "DoctorFacility"("facilityId");

-- CreateIndex
CREATE INDEX "DoctorFacility_organizationId_idx" ON "DoctorFacility"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorFacility_doctorId_facilityId_key" ON "DoctorFacility"("doctorId", "facilityId");

-- AddForeignKey
ALTER TABLE "DoctorFacility" ADD CONSTRAINT "DoctorFacility_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorFacility" ADD CONSTRAINT "DoctorFacility_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
