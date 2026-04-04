CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "FacilityType" AS ENUM (
  'CLINIC',
  'HOSPITAL',
  'DIAGNOSTIC',
  'PHARMACY'
);

CREATE TYPE "Gender" AS ENUM (
  'Male',
  'Female',
  'Other'
);

CREATE TYPE "AppointmentStatus" AS ENUM (
  'BOOKED',
  'CANCELLED',
  'COMPLETED'
);

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

CREATE TABLE "organizations" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "organizations_name_idx" ON "organizations"("name");

CREATE TABLE "facilities" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "FacilityType" NOT NULL,
  "code" TEXT,
  "gstNumber" TEXT,
  "address" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "facilities_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "facilities_organizationId_idx" ON "facilities"("organizationId");
CREATE INDEX "facilities_type_idx" ON "facilities"("type");

CREATE TABLE "roles" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "roles_name_idx" ON "roles"("name");

CREATE TABLE "permissions" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "permissions_key_key" UNIQUE ("key")
);

CREATE TABLE "role_permissions" (
  "id" TEXT PRIMARY KEY,
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  CONSTRAINT "role_permissions_roleId_permissionId_key" UNIQUE ("roleId", "permissionId"),
  CONSTRAINT "role_permissions_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "role_permissions_permissionId_fkey"
    FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "role_permissions_roleId_idx" ON "role_permissions"("roleId");
CREATE INDEX "role_permissions_permissionId_idx" ON "role_permissions"("permissionId");

CREATE TABLE "user_roles" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "facilityId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_roles_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "user_roles_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");
CREATE INDEX "user_roles_facilityId_idx" ON "user_roles"("facilityId");
CREATE INDEX "user_roles_userId_facilityId_idx" ON "user_roles"("userId", "facilityId");

CREATE TABLE "audit_logs" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "facilityId" TEXT,
  "organizationId" TEXT,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "resourceId" TEXT,
  "permissionUsed" TEXT,
  "isSuperAdmin" BOOLEAN NOT NULL,
  "permissionsSnapshot" TEXT[] NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_facilityId_idx" ON "audit_logs"("facilityId");
CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");
CREATE INDEX "audit_logs_facilityId_createdAt_idx" ON "audit_logs"("facilityId", "createdAt");
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

CREATE TABLE "AuditDailyAggregate" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "date" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "total" INTEGER NOT NULL,
  "users" JSONB NOT NULL,
  "actions" JSONB NOT NULL,
  "resources" JSONB NOT NULL,
  "facilities" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditDailyAggregate_tenantId_date_key" UNIQUE ("tenantId", "date")
);

CREATE TABLE "FinancialDailyAggregate" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "facilityId" TEXT NOT NULL,
  "revenue" DECIMAL(18, 2) NOT NULL,
  "tax" DECIMAL(18, 2) NOT NULL,
  "discount" DECIMAL(18, 2) NOT NULL,
  "refunds" DECIMAL(18, 2) NOT NULL,
  "writeOff" DECIMAL(18, 2) NOT NULL,
  "netRevenue" DECIMAL(18, 2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialDailyAggregate_date_facilityId_key" UNIQUE ("date", "facilityId"),
  CONSTRAINT "FinancialDailyAggregate_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "FinancialDailyAggregate_facilityId_idx" ON "FinancialDailyAggregate"("facilityId");
CREATE INDEX "FinancialDailyAggregate_date_idx" ON "FinancialDailyAggregate"("date");
CREATE INDEX "FinancialDailyAggregate_facilityId_date_idx" ON "FinancialDailyAggregate"("facilityId", "date");

CREATE TABLE "AuditAnomaly" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AuditAnomaly_userId_idx" ON "AuditAnomaly"("userId");

CREATE TABLE "AuditAlert" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AuditAlert_userId_createdAt_idx" ON "AuditAlert"("userId", "createdAt");
CREATE INDEX "AuditAlert_type_idx" ON "AuditAlert"("type");
CREATE INDEX "AuditAlert_severity_idx" ON "AuditAlert"("severity");

CREATE TABLE "UserRiskScore" (
  "userId" TEXT PRIMARY KEY,
  "score" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "UserRiskScore_score_idx" ON "UserRiskScore"("score");

CREATE TABLE "UserBehaviorProfile" (
  "userId" TEXT PRIMARY KEY,
  "avgActionsPerMinute" DOUBLE PRECISION NOT NULL,
  "lastUpdated" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Patient" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "facilityId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "gender" "Gender" NOT NULL,
  "dob" TIMESTAMP(3),
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX "Patient_facilityId_createdAt_idx" ON "Patient"("facilityId", "createdAt");
CREATE INDEX "Patient_facilityId_idx" ON "Patient"("facilityId");
CREATE INDEX "Patient_createdAt_idx" ON "Patient"("createdAt");
CREATE INDEX "Patient_name_idx" ON "Patient"("name");
CREATE INDEX "Patient_facilityId_isDeleted_idx" ON "Patient"("facilityId", "isDeleted");

CREATE TABLE "Doctor" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
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
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "Doctor_email_key" ON "Doctor"("email");
CREATE INDEX "Doctor_isActive_idx" ON "Doctor"("isActive");
CREATE INDEX "Doctor_createdAt_idx" ON "Doctor"("createdAt");
CREATE INDEX "Doctor_lastName_firstName_idx" ON "Doctor"("lastName", "firstName");
CREATE INDEX "Doctor_specialization_idx" ON "Doctor"("specialization");

CREATE TABLE "DoctorFacility" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "doctorId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "consultationFee" DOUBLE PRECISION,
  "consultationDuration" INTEGER,
  "bufferBefore" INTEGER NOT NULL DEFAULT 0,
  "bufferAfter" INTEGER NOT NULL DEFAULT 0,
  "consultationStartTime" TEXT,
  "consultationEndTime" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DoctorFacility_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DoctorFacility_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DoctorFacility_doctorId_facilityId_key" ON "DoctorFacility"("doctorId", "facilityId");
CREATE INDEX "DoctorFacility_doctorId_idx" ON "DoctorFacility"("doctorId");
CREATE INDEX "DoctorFacility_facilityId_idx" ON "DoctorFacility"("facilityId");
CREATE INDEX "DoctorFacility_organizationId_idx" ON "DoctorFacility"("organizationId");

CREATE TABLE "DoctorSchedule" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "doctorId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DoctorSchedule_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DoctorSchedule_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DoctorSchedule_doctorId_facilityId_dayOfWeek_idx"
  ON "DoctorSchedule"("doctorId", "facilityId", "dayOfWeek");
CREATE INDEX "DoctorSchedule_facilityId_dayOfWeek_idx"
  ON "DoctorSchedule"("facilityId", "dayOfWeek");

CREATE TABLE "DoctorInvite" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "doctorId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DoctorInvite_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DoctorInvite_tokenHash_key" ON "DoctorInvite"("tokenHash");
CREATE INDEX "DoctorInvite_doctorId_idx" ON "DoctorInvite"("doctorId");
CREATE INDEX "DoctorInvite_email_idx" ON "DoctorInvite"("email");
CREATE INDEX "DoctorInvite_expiresAt_idx" ON "DoctorInvite"("expiresAt");

CREATE TABLE "Appointment" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "patientId" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "status" "AppointmentStatus" NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Appointment_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Appointment_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Appointment_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Appointment_facilityId_startTime_idx" ON "Appointment"("facilityId", "startTime");
CREATE INDEX "Appointment_doctorId_startTime_idx" ON "Appointment"("doctorId", "startTime");
CREATE INDEX "Appointment_facilityId_status_startTime_idx" ON "Appointment"("facilityId", "status", "startTime");
CREATE INDEX "Appointment_doctorId_status_startTime_idx" ON "Appointment"("doctorId", "status", "startTime");
CREATE UNIQUE INDEX "Appointment_doctorId_startTime_booked_key"
  ON "Appointment"("doctorId", "startTime")
  WHERE "status" = 'BOOKED';

CREATE TABLE "Billing" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "patientId" TEXT NOT NULL,
  "doctorId" TEXT,
  "facilityId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "status" "BillingStatus" NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Billing_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Billing_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Billing_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Billing_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Billing_appointmentId_key" ON "Billing"("appointmentId");
CREATE INDEX "Billing_facilityId_createdAt_idx" ON "Billing"("facilityId", "createdAt");
CREATE INDEX "Billing_facilityId_status_createdAt_idx" ON "Billing"("facilityId", "status", "createdAt");
CREATE INDEX "Billing_facilityId_doctorId_createdAt_idx" ON "Billing"("facilityId", "doctorId", "createdAt");
CREATE INDEX "Billing_patientId_idx" ON "Billing"("patientId");
CREATE INDEX "Billing_doctorId_idx" ON "Billing"("doctorId");

CREATE TABLE "BillingItem" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "billingId" TEXT NOT NULL,
  "type" "BillingItemType" NOT NULL,
  "name" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(18, 2) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingItem_billingId_fkey"
    FOREIGN KEY ("billingId") REFERENCES "Billing"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "BillingItem_billingId_createdAt_idx" ON "BillingItem"("billingId", "createdAt");

CREATE TABLE "LedgerEntry" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "billingId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "type" "LedgerType" NOT NULL,
  "amount" DECIMAL(18, 2) NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT,
  "metadata" JSONB,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEntry_billingId_fkey"
    FOREIGN KEY ("billingId") REFERENCES "Billing"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LedgerEntry_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "LedgerEntry_billingId_idx" ON "LedgerEntry"("billingId");
CREATE INDEX "LedgerEntry_facilityId_idx" ON "LedgerEntry"("facilityId");
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");
CREATE INDEX "LedgerEntry_facilityId_createdAt_idx" ON "LedgerEntry"("facilityId", "createdAt");
CREATE INDEX "LedgerEntry_billingId_type_idx" ON "LedgerEntry"("billingId", "type");
CREATE INDEX "LedgerEntry_facilityId_type_createdAt_idx" ON "LedgerEntry"("facilityId", "type", "createdAt");
CREATE INDEX "LedgerEntry_referenceType_referenceId_idx" ON "LedgerEntry"("referenceType", "referenceId");

CREATE TABLE "Payment" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "billingId" TEXT NOT NULL,
  "amount" DECIMAL(18, 2) NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "referenceId" TEXT,
  "idempotencyKey" TEXT,
  "status" "PaymentStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_billingId_fkey"
    FOREIGN KEY ("billingId") REFERENCES "Billing"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Payment_billingId_idx" ON "Payment"("billingId");
CREATE INDEX "Payment_billingId_createdAt_idx" ON "Payment"("billingId", "createdAt");
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");
CREATE INDEX "Payment_method_createdAt_idx" ON "Payment"("method", "createdAt");
CREATE INDEX "Payment_referenceId_idx" ON "Payment"("referenceId");
CREATE UNIQUE INDEX "Payment_billingId_idempotencyKey_key"
  ON "Payment"("billingId", "idempotencyKey");

CREATE TABLE "Service" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "name" TEXT NOT NULL,
  "type" "BillingItemType" NOT NULL,
  "defaultPrice" DECIMAL(18, 2) NOT NULL,
  "facilityId" TEXT NOT NULL,
  CONSTRAINT "Service_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Service_facilityId_idx" ON "Service"("facilityId");
CREATE INDEX "Service_facilityId_name_idx" ON "Service"("facilityId", "name");

CREATE TABLE "Invoice" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "billingId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invoice_billingId_fkey"
    FOREIGN KEY ("billingId") REFERENCES "Billing"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Invoice_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Invoice_billingId_key" ON "Invoice"("billingId");
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_facilityId_idx" ON "Invoice"("facilityId");
CREATE INDEX "Invoice_billingId_idx" ON "Invoice"("billingId");
CREATE INDEX "Invoice_facilityId_createdAt_idx" ON "Invoice"("facilityId", "createdAt");

CREATE TABLE "InvoiceSequence" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "facilityId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InvoiceSequence_facilityId_fkey"
    FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InvoiceSequence_facilityId_year_key" ON "InvoiceSequence"("facilityId", "year");
CREATE INDEX "InvoiceSequence_facilityId_idx" ON "InvoiceSequence"("facilityId");
