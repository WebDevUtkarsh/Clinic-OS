-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Patient_facilityId_isDeleted_idx" ON "Patient"("facilityId", "isDeleted");
