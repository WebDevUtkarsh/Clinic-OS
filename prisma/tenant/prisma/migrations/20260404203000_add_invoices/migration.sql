CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "billingId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invoice_billingId_key" ON "Invoice"("billingId");
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_facilityId_idx" ON "Invoice"("facilityId");
CREATE INDEX "Invoice_billingId_idx" ON "Invoice"("billingId");
CREATE INDEX "Invoice_facilityId_createdAt_idx" ON "Invoice"("facilityId", "createdAt");

CREATE TABLE "InvoiceSequence" (
  "id" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoiceSequence_facilityId_year_key"
  ON "InvoiceSequence"("facilityId", "year");
CREATE INDEX "InvoiceSequence_facilityId_idx" ON "InvoiceSequence"("facilityId");

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_billingId_fkey"
  FOREIGN KEY ("billingId") REFERENCES "Billing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InvoiceSequence" ADD CONSTRAINT "InvoiceSequence_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
