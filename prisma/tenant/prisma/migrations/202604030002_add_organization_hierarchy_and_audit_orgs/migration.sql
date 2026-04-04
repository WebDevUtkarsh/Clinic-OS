ALTER TYPE "FacilityType" RENAME VALUE 'DIAGNOSTIC_CENTRE' TO 'DIAGNOSTIC';

ALTER TYPE "FacilityType" ADD VALUE IF NOT EXISTS 'PHARMACY';

CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "organizations_name_idx" ON "organizations"("name");

ALTER TABLE "facilities" ADD COLUMN "organizationId" TEXT;

DO $$
DECLARE
  default_org_id TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM "facilities") THEN
    default_org_id := 'org_' || replace(gen_random_uuid()::text, '-', '');

    INSERT INTO "organizations" ("id", "name", "createdAt", "updatedAt")
    VALUES (default_org_id, 'Default Organization', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    UPDATE "facilities"
    SET "organizationId" = default_org_id
    WHERE "organizationId" IS NULL;
  END IF;
END $$;

ALTER TABLE "facilities" ALTER COLUMN "organizationId" SET NOT NULL;

CREATE INDEX "facilities_organizationId_idx" ON "facilities"("organizationId");

ALTER TABLE "facilities"
  ADD CONSTRAINT "facilities_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD COLUMN "organizationId" TEXT;

UPDATE "audit_logs"
SET "permissionsSnapshot" = ARRAY[]::TEXT[]
WHERE "permissionsSnapshot" IS NULL;

ALTER TABLE "audit_logs" ALTER COLUMN "permissionsSnapshot" SET NOT NULL;

CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");

DROP INDEX IF EXISTS "AuditDailyAggregate_date_key";

CREATE UNIQUE INDEX "AuditDailyAggregate_tenantId_date_key"
ON "AuditDailyAggregate"("tenantId", "date");

INSERT INTO "permissions" ("id", "key", "createdAt")
VALUES
  ('perm_org_create', 'organizations:create', CURRENT_TIMESTAMP),
  ('perm_facility_create', 'facilities:create', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("id", "roleId", "permissionId")
SELECT
  'rp_' || replace(gen_random_uuid()::text, '-', ''),
  owner_role."id",
  permission."id"
FROM "roles" AS owner_role
CROSS JOIN "permissions" AS permission
WHERE owner_role."name" = 'OWNER'
  AND permission."key" IN ('organizations:create', 'facilities:create')
  AND NOT EXISTS (
    SELECT 1
    FROM "role_permissions" existing
    WHERE existing."roleId" = owner_role."id"
      AND existing."permissionId" = permission."id"
  );
