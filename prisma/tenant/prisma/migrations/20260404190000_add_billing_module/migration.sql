CREATE TYPE "BillingStatus" AS ENUM (
  'DRAFT',
  'GENERATED',
  'PARTIALLY_PAID',
  'PAID',
  'CANCELLED'
);

CREATE TYPE "BillingItemType" AS ENUM (
  'CONSULTATION',
  'TREATMENT',
  'LAB',
  'MEDICATION',
  'PACKAGE',
  'OTHER'
);

CREATE TYPE "LedgerType" AS ENUM (
  'CHARGE',
  'PAYMENT',
  'REFUND',
  'DISCOUNT',
  'TAX',
  'WRITE_OFF'
);

CREATE TYPE "PaymentMethod" AS ENUM (
  'CASH',
  'CARD',
  'UPI',
  'ONLINE'
);

CREATE TYPE "PaymentStatus" AS ENUM (
  'SUCCESS',
  'FAILED',
  'REFUNDED'
);

CREATE TABLE "Billing" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "doctorId" TEXT,
  "facilityId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "status" "BillingStatus" NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Billing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Billing_appointmentId_key" ON "Billing"("appointmentId");
CREATE INDEX "Billing_facilityId_createdAt_idx" ON "Billing"("facilityId", "createdAt");
CREATE INDEX "Billing_facilityId_status_createdAt_idx" ON "Billing"("facilityId", "status", "createdAt");
CREATE INDEX "Billing_patientId_idx" ON "Billing"("patientId");
CREATE INDEX "Billing_doctorId_idx" ON "Billing"("doctorId");

CREATE TABLE "BillingItem" (
  "id" TEXT NOT NULL,
  "billingId" TEXT NOT NULL,
  "type" "BillingItemType" NOT NULL,
  "name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(18, 2) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BillingItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BillingItem_billingId_createdAt_idx" ON "BillingItem"("billingId", "createdAt");

CREATE TABLE "LedgerEntry" (
  "id" TEXT NOT NULL,
  "billingId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "type" "LedgerType" NOT NULL,
  "amount" DECIMAL(18, 2) NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT,
  "metadata" JSONB,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LedgerEntry_billingId_idx" ON "LedgerEntry"("billingId");
CREATE INDEX "LedgerEntry_facilityId_idx" ON "LedgerEntry"("facilityId");
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");
CREATE INDEX "LedgerEntry_billingId_type_idx" ON "LedgerEntry"("billingId", "type");
CREATE INDEX "LedgerEntry_referenceType_referenceId_idx" ON "LedgerEntry"("referenceType", "referenceId");

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "billingId" TEXT NOT NULL,
  "amount" DECIMAL(18, 2) NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "referenceId" TEXT,
  "idempotencyKey" TEXT,
  "status" "PaymentStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Payment_billingId_idx" ON "Payment"("billingId");
CREATE INDEX "Payment_billingId_createdAt_idx" ON "Payment"("billingId", "createdAt");
CREATE INDEX "Payment_referenceId_idx" ON "Payment"("referenceId");
CREATE UNIQUE INDEX "Payment_billingId_idempotencyKey_key"
  ON "Payment"("billingId", "idempotencyKey");

CREATE TABLE "Service" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "BillingItemType" NOT NULL,
  "defaultPrice" DECIMAL(18, 2) NOT NULL,
  "facilityId" TEXT NOT NULL,

  CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Service_facilityId_idx" ON "Service"("facilityId");
CREATE INDEX "Service_facilityId_name_idx" ON "Service"("facilityId", "name");

ALTER TABLE "Billing" ADD CONSTRAINT "Billing_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BillingItem" ADD CONSTRAINT "BillingItem_billingId_fkey"
  FOREIGN KEY ("billingId") REFERENCES "Billing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_billingId_fkey"
  FOREIGN KEY ("billingId") REFERENCES "Billing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_billingId_fkey"
  FOREIGN KEY ("billingId") REFERENCES "Billing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Service" ADD CONSTRAINT "Service_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "key", "createdAt")
VALUES
  ('perm_billing_read', 'billing:read', CURRENT_TIMESTAMP),
  ('perm_billing_create', 'billing:create', CURRENT_TIMESTAMP),
  ('perm_billing_update', 'billing:update', CURRENT_TIMESTAMP),
  ('perm_billing_delete', 'billing:delete', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT
  'rp_' || replace(gen_random_uuid()::text, '-', ''),
  owner_role."id",
  permission."id"
FROM "roles" AS owner_role
CROSS JOIN "permissions" AS permission
WHERE owner_role."name" = 'OWNER'
  AND permission."key" IN (
    'billing:read',
    'billing:create',
    'billing:update',
    'billing:delete'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "role_permissions" existing
    WHERE existing."roleId" = owner_role."id"
      AND existing."permissionId" = permission."id"
  );
