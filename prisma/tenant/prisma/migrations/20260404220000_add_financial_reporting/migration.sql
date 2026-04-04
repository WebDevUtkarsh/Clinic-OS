CREATE TABLE "FinancialDailyAggregate" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "facilityId" TEXT NOT NULL,
    "revenue" DECIMAL(18,2) NOT NULL,
    "tax" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(18,2) NOT NULL,
    "refunds" DECIMAL(18,2) NOT NULL,
    "writeOff" DECIMAL(18,2) NOT NULL,
    "netRevenue" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialDailyAggregate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialDailyAggregate_date_facilityId_key"
  ON "FinancialDailyAggregate"("date", "facilityId");
CREATE INDEX "FinancialDailyAggregate_facilityId_idx"
  ON "FinancialDailyAggregate"("facilityId");
CREATE INDEX "FinancialDailyAggregate_date_idx"
  ON "FinancialDailyAggregate"("date");
CREATE INDEX "FinancialDailyAggregate_facilityId_date_idx"
  ON "FinancialDailyAggregate"("facilityId", "date");

CREATE INDEX "Billing_facilityId_doctorId_createdAt_idx"
  ON "Billing"("facilityId", "doctorId", "createdAt");

CREATE INDEX "LedgerEntry_facilityId_createdAt_idx"
  ON "LedgerEntry"("facilityId", "createdAt");
CREATE INDEX "LedgerEntry_facilityId_type_createdAt_idx"
  ON "LedgerEntry"("facilityId", "type", "createdAt");

CREATE INDEX "Payment_createdAt_idx"
  ON "Payment"("createdAt");
CREATE INDEX "Payment_method_createdAt_idx"
  ON "Payment"("method", "createdAt");

ALTER TABLE "FinancialDailyAggregate" ADD CONSTRAINT "FinancialDailyAggregate_facilityId_fkey"
  FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "permissions" ("id", "key", "createdAt")
VALUES
  ('perm_reports_read', 'reports:read', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT
  'rp_' || replace(gen_random_uuid()::text, '-', ''),
  owner_role."id",
  permission."id"
FROM "roles" AS owner_role
CROSS JOIN "permissions" AS permission
WHERE owner_role."name" = 'OWNER'
  AND permission."key" IN ('reports:read')
  AND NOT EXISTS (
    SELECT 1
    FROM "role_permissions" existing
    WHERE existing."roleId" = owner_role."id"
      AND existing."permissionId" = permission."id"
  );
