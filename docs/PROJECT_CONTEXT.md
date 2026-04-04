# ClinicOS Project Documentation

## 1. Project Overview

ClinicOS is a production-oriented multi-tenant SaaS backend for healthcare operations. The platform is designed around strict tenant isolation, facility-scoped access control, asynchronous audit processing, Redis-backed caching and analytics, and queue-driven background work.

At a high level, the platform provides:

- Control-plane tenant and identity management
- Per-tenant PostgreSQL databases
- JWT cookie authentication
- Permission-based RBAC with facility scoping
- Organization and facility onboarding
- Patient creation as the first tenant business module
- Asynchronous audit logging
- Audit analytics, anomaly detection, alerts, risk scoring, and behavior profiling

This codebase currently focuses primarily on backend APIs and infrastructure workflows rather than a fully built frontend product flow.

## 2. Core Architecture

### 2.1 High-Level Hierarchy

```text
Control DB
|- Users
|- Tenants
|- TenantMembers
|- Control Audit Logs
|- Alert Webhooks

Per Tenant DB
|- Organizations
|  \- Facilities
|     \- Patients
|
|- Roles
|- Permissions
|- RolePermissions
|- UserRoles
|
|- Audit Logs
|- Audit Daily Aggregates
|- Audit Alerts
|- Audit Anomalies
|- User Risk Scores
\- User Behavior Profiles
```

### 2.2 Isolation Model

- Every tenant gets its own PostgreSQL database.
- The control database only stores platform-level identity, tenant registry, membership, control audit logs, and alert webhook configuration.
- Business data, RBAC data, audit data, analytics, and risk data live in the tenant database.
- There are no intended cross-tenant queries in the business data path.

### 2.3 Domain Hierarchy

- Tenant: SaaS customer account registered in the control DB
- Organization: business entity inside a tenant DB
- Facility: operational unit under an organization
- Patient: business record scoped to a facility

Organization switching is implicit through facility selection. A facility always belongs to exactly one organization.

## 3. Technology Stack

### 3.1 Runtime

- Next.js `16.2.1`
- React `19.2.4`
- TypeScript `5`
- Prisma `7.6.0`
- PostgreSQL via `pg` and `@prisma/adapter-pg`
- Redis via `ioredis`
- BullMQ for async jobs
- `jsonwebtoken` for JWT
- `bcrypt` for password hashing
- `zod` for request validation
- `axios` for webhook/slack delivery
- `resend` for email alerts

### 3.2 Style of Architecture

- App Router APIs in `src/app/api`
- Request gatekeeping through `src/proxy.ts`
- Shared domain logic under `src/lib`
- Background workers under `src/workers`
- Prisma schema split into `prisma/control` and `prisma/tenant`
- Generated Prisma clients checked into `src/generated`

## 4. Repository Structure

### 4.1 Top-Level Important Paths

- `docs/Architecture.md`
- `docs/AUTH_RBAC_ARCHITECTURE.md`
- `docs/PROJECT_CONTEXT.md`
- `package.json`
- `prisma/control/*`
- `prisma/tenant/*`
- `src/app/api/*`
- `src/lib/*`
- `src/workers/*`
- `src/generated/control/*`
- `src/generated/tenant/*`

### 4.2 Source Layout

#### `src/app/api`

- `alerts/route.ts`
- `audit-analytics/route.ts`
- `audit-analytics/permissions/route.ts`
- `audit-analytics/top-users/route.ts`
- `audit-analytics/trends/route.ts`
- `audit-insights/route.ts`
- `audit-logs/route.ts`
- `auth/login/route.ts`
- `auth/logout/route.ts`
- `auth/me/route.ts`
- `auth/register/route.ts`
- `behavior/route.ts`
- `control-audit/route.ts`
- `facilities/route.ts`
- `organizations/route.ts`
- `patients/route.ts`
- `risk/route.ts`
- `security/insights/route.ts`

#### `src/lib/auth`

- `context.ts`
- `jwt.ts`
- `password.ts`
- `tenant-state.ts`

#### `src/lib/audit`

- `aggregator.ts`
- `anomaly.ts`
- `control.ts`
- `logger.ts`
- `queue.ts`
- `rollup.ts`
- `writer.ts`

#### `src/lib/alert`

- `dispatcher.ts`
- `queue.ts`
- `types.ts`
- `writer.ts`
- `providers/email.ts`
- `providers/slack.ts`
- `providers/webhook.ts`

#### `src/lib/cache`

- `auth-cache.ts`
- `invalidate.ts`

#### `src/lib/prisma`

- `control.ts`
- `tenant.ts`

#### Other `src/lib` modules

- `behavior/profile.ts`
- `facility/context.ts`
- `queue/redis.ts`
- `rbac/cache.ts`
- `rbac/guard.ts`
- `rbac/permissions.ts`
- `risk/engine.ts`
- `security/rate-limit.ts`
- `services/tenant.service.ts`

#### `src/workers`

- `alert.worker.ts`
- `audit.rollup.worker.ts`
- `audit.worker.ts`

#### Generated Prisma Clients

- `src/generated/control/*`
- `src/generated/tenant/*`

These are generated artifacts from the Prisma schemas and should be regenerated when schema changes are made.

## 5. Scripts

Defined in `package.json`:

- `npm run dev`
  Starts the Next.js development server.
- `npm run build`
  Builds the Next.js application.
- `npm run start`
  Starts the production build.
- `npm run lint`
  Runs ESLint.
- `npm run worker:audit`
  Starts the BullMQ audit worker.
- `npm run prisma:control:migrate`
  Runs control DB migrations using `prisma/control/prisma.config.ts`.
- `npm run prisma:control:generate`
  Regenerates the control Prisma client.
- `npm run prisma:tenant:migrate`
  Runs tenant DB migrations using `prisma/tenant/prisma.config.ts`.
- `npm run prisma:tenant:generate`
  Regenerates the tenant Prisma client.

## 6. Configuration and Environment Variables

### 6.1 Required Runtime Variables

- `CONTROL_URL`
  PostgreSQL connection string for the control database.
- `TENANT_URL`
  Prisma 7 config datasource URL for tenant schema generation and tenant migrations.
- `POSTGRES_BASE_URL`
  Base PostgreSQL URL used to create new tenant databases during provisioning.
- `REDIS_URL`
  Redis connection string used by auth caching, rate limiting, BullMQ, aggregation, anomaly detection, and alert dedupe.
- `JWT_SECRET`
  Secret used to sign and verify auth JWTs.

### 6.2 Optional or Integration Variables

- `SLACK_WEBHOOK_URL`
  Used by the Slack alert provider.
- `RESEND_API_KEY`
  Used by email alert delivery.
- `NODE_ENV`
  Controls secure cookie settings and Prisma global caching behavior.

### 6.3 Important Operational Note

Even though many Redis call sites degrade gracefully on runtime errors, the current Redis client module throws during startup if `REDIS_URL` is completely missing. In practice, the application still expects Redis to be configured.

## 7. Database Design

## 7.1 Control Database Schema

Defined by `prisma/control/schema.prisma` and `prisma/control/enum.prisma`.

### Models

#### `User`

- Global user identity
- Fields:
  - `id`
  - `email`
  - `name`
  - `password`
  - `phone`
  - timestamps

#### `Tenant`

- Tenant registry and status management
- Fields:
  - `id`
  - `name`
  - `slug`
  - `dbUrl`
  - `status`
  - timestamps

#### `TenantMember`

- Links a control-plane user to a tenant
- Fields:
  - `userId`
  - `tenantId`
  - `role`
  - `createdAt`
- Unique on `[userId, tenantId]`

#### `AuditLog`

- Control-plane audit table
- Used for auth and platform-level audit events
- Fields:
  - `id`
  - `userId`
  - `tenantId`
  - `action`
  - `metadata`
  - `createdAt`

#### `AlertWebhook`

- Tenant-specific webhook configuration stored centrally
- Fields:
  - `tenantId`
  - `url`
  - `isActive`
  - `createdAt`

### Enums

#### `TenantStatus`

- `PROVISIONING`
- `ONBOARDING`
- `ACTIVE`
- `FAILED`

#### `TenantRole`

- `OWNER`
- `ADMIN`
- `DOCTOR`
- `STAFF`

## 7.2 Tenant Database Schema

Defined by `prisma/tenant/schema.prisma` and `prisma/tenant/enum.prisma`.

### Business and Hierarchy Models

#### `Organization`

- Top-level business entity within a tenant DB
- Has many facilities

#### `Facility`

- Belongs to an organization
- Supports type and address
- Used as the main business-scope boundary for access control

#### `Patient`

- Facility-scoped patient record
- Fields include:
  - `facilityId`
  - `name`
  - `gender`
  - `dob`
  - `phone`
  - `email`
  - `address`

### RBAC Models

#### `Role`

- Named role, such as `OWNER`

#### `Permission`

- String-based permission key, such as `patients:create`

#### `RolePermission`

- Many-to-many join between roles and permissions

#### `UserRole`

- Maps user to role
- Can be global to tenant with `facilityId = null`
- Can be facility-scoped with `facilityId = <facility id>`

### Audit and Security Models

#### `AuditLog`

- Tenant-scoped audit event table
- Includes:
  - `userId`
  - `facilityId`
  - `organizationId`
  - `action`
  - `resource`
  - `resourceId`
  - `permissionUsed`
  - `isSuperAdmin`
  - `permissionsSnapshot`
  - `ip`
  - `userAgent`
  - `createdAt`

#### `AuditDailyAggregate`

- Daily rollup table keyed by `[tenantId, date]`
- Stores JSON aggregate objects for:
  - users
  - actions
  - resources
  - facilities
  - total count

#### `AuditAnomaly`

- Stores anomaly results keyed by user

#### `AuditAlert`

- Stores alert records with severity and metadata

#### `UserRiskScore`

- Maintains per-user risk score

#### `UserBehaviorProfile`

- Maintains simplified behavior profile metrics

### Tenant Enums

#### `FacilityType`

- `CLINIC`
- `HOSPITAL`
- `DIAGNOSTIC`
- `PHARMACY`

#### `Gender`

- `Male`
- `Female`
- `Other`

## 7.3 Tenant SQL Bootstrap

`prisma/tenant/init.sql` is the raw SQL bootstrap used during tenant provisioning. It is expected to stay aligned with:

- `prisma/tenant/schema.prisma`
- `prisma/tenant/enum.prisma`

It is used when a new tenant database is created through the provisioning service.

## 7.4 Prisma Config

Prisma 7 config files:

- `prisma/control/prisma.config.ts`
- `prisma/tenant/prisma.config.ts`

Both use `defineConfig` and pick up datasource URLs from environment variables.

## 8. Authentication System

## 8.1 Auth Strategy

- Login uses email and password verification.
- Passwords are hashed with bcrypt using 12 salt rounds.
- JWT is signed with `jsonwebtoken`.
- JWT payload is intentionally minimal:
  - `userId`
  - `activeTenantId`

No permissions, roles, or facility IDs are embedded in the token.

## 8.2 Cookie Strategy

The auth token is stored in an `HttpOnly` cookie called `auth_token`.

Cookie settings:

- `httpOnly: true`
- `sameSite: "strict"`
- `path: "/"`
- `secure: process.env.NODE_ENV === "production"`

## 8.3 Proxy-Based Auth Context Injection

`src/proxy.ts` is the request entrypoint for authenticated API routes in Next.js 16.

Behavior:

- Skips `/api/auth/*`, `/_next/*`, and `/favicon.ico`
- Reads `auth_token` from cookie
- Verifies JWT
- Resolves auth context using Redis cache first, then tenant DB
- Injects request headers:
  - `x-user-id`
  - `x-tenant-id`
  - `x-permissions`
  - `x-facilities`
  - `x-super-admin`
- Returns `401` if auth fails

This project uses `proxy.ts`, not `middleware.ts`, because Next.js 16 deprecates the old middleware file convention.

## 8.4 Auth Context Resolution

Implemented in `src/lib/auth/context.ts`.

### `buildAuthContext`

Loads from tenant DB:

- all `user_roles` for the user
- role IDs
- role permissions
- distinct facility IDs

Returns:

- `permissions: string[]`
- `facilityIds: string[]`
- `isSuperAdmin: boolean`

`isSuperAdmin` is currently inferred by the presence of `"*"` in permissions.

### `resolveAuthContext`

- Tries Redis auth cache
- Falls back to DB rebuild on cache miss or cache failure
- Best-effort caches rebuilt context back into Redis

### `refreshAuthContext`

- Always rebuilds from DB
- Overwrites cache with latest context

## 8.5 JWT Behavior

Defined in `src/lib/auth/jwt.ts`.

- Token lifetime: `7d`
- Issuer: `tenorix`
- Audience: `tenorix-users`
- Verification accepts legacy `tenantId` payloads but normalizes to `activeTenantId`

## 8.6 Password Behavior

Defined in `src/lib/auth/password.ts`.

- `hashPassword(plainPassword)`
- `verifyPassword(plainPassword, hashedPassword)`

## 9. Onboarding and Tenant Lifecycle

## 9.1 Tenant Statuses

- `PROVISIONING`
- `ONBOARDING`
- `ACTIVE`
- `FAILED`

Accessible statuses for login are currently:

- `ONBOARDING`
- `ACTIVE`

## 9.2 Registration Flow

`POST /api/auth/register`

Current flow:

1. Validate input with Zod
2. Rate limit by IP and email
3. Create control user
4. Create control tenant with `PROVISIONING` status
5. Create control tenant membership with role `OWNER`
6. Provision tenant infrastructure
7. If provisioning succeeds, set tenant status to `ONBOARDING`
8. Return:
   - `success`
   - `tenantId`
   - `tenantStatus`

On failure:

- Writes control audit failure event
- Best-effort cleans up created control records if provisioning fails after registration transaction

## 9.3 Tenant Provisioning

Implemented in `src/lib/services/tenant.service.ts`.

Behavior:

- Generates a new database name
- Creates the database through the PostgreSQL `Client`
- Builds tenant DB URL from `POSTGRES_BASE_URL`
- Reads and executes `prisma/tenant/init.sql`
- Instantiates a tenant Prisma client against the new DB
- Seeds base permissions
- Creates or resolves `OWNER` role
- Assigns bootstrap global `OWNER` user role with `facilityId = null`
- Updates control tenant:
  - `dbUrl`
  - `status = ONBOARDING`
- Invalidates cached auth context for the provisioning user

If provisioning fails:

- Attempts to drop the created tenant database
- Marks control tenant as `FAILED`

## 9.4 Login Flow

`POST /api/auth/login`

Behavior:

- Validates input
- Rate limits by IP and email
- Verifies password
- Loads tenant memberships with tenant status in `ONBOARDING` or `ACTIVE`
- Supports multi-tenant membership response when more than one accessible tenant exists
- If only one accessible tenant exists:
  - signs JWT
  - resolves auth context
  - resolves onboarding state
  - sets auth cookie
  - returns onboarding flags

Response fields on normal success:

- `success`
- `activeTenantId`
- `tenantStatus`
- `requiresOrganizationSetup`
- `requiresFacilitySetup`
- `accessibleFacilityIds`

## 9.5 Auth Session Inspection

`GET /api/auth/me`

Returns:

- current user
- tenant info
- control membership role
- permissions
- facility IDs
- `isSuperAdmin`
- tenant onboarding state

It also clears the auth cookie if token verification or tenant access validation fails.

## 9.6 Logout Flow

`POST /api/auth/logout`

Behavior:

- Always clears the auth cookie
- Returns success even if token is missing or invalid
- If a valid token exists:
  - invalidates auth cache
  - writes control audit logout event
- Sets `Cache-Control: no-store`

## 9.7 Organization and Facility Onboarding

### `POST /api/organizations`

- Requires permission `organizations:create`
- Uses auth headers injected by proxy
- Rate limited
- Creates organization in tenant DB
- Writes tenant audit event

### `POST /api/facilities`

- Requires permission `facilities:create`
- Rate limited
- Validates organization ownership within tenant DB
- Creates facility
- Assigns facility-scoped `OWNER` role to creator if missing
- Updates control tenant status to `ACTIVE`
- Invalidates auth cache
- Writes tenant audit event

## 9.8 Onboarding State Helper

Implemented in `src/lib/auth/tenant-state.ts`.

`resolveTenantOnboardingState` counts:

- organizations
- facilities

and returns:

- `tenantStatus`
- `requiresOrganizationSetup`
- `requiresFacilitySetup`
- `accessibleFacilityIds`

## 10. Authorization and RBAC

## 10.1 Authorization Strategy

This codebase uses permission-based RBAC with optional facility scoping.

Authorization decisions are based on:

- injected auth headers
- permission list
- facility IDs available to the user
- `isSuperAdmin` flag

Role names are not required in request-time authorization checks.

## 10.2 Request Guard

Implemented in `src/lib/rbac/guard.ts`.

`requireAccess(req, options)`:

- reads auth context from headers
- returns `401` if auth context is absent or malformed
- bypasses checks if `x-super-admin` is `true`
- requires presence of the requested permission
- if `facilityScoped` is enabled:
  - requires `x-facility-id`
  - requires that facility to be in the user’s authorized facility IDs

## 10.3 Facility Context Helper

Implemented in `src/lib/facility/context.ts`.

`requireFacilityContext(req)`:

- validates `x-tenant-id`
- reads `x-facility-id`
- checks whether any facility exists at all for tenant onboarding behavior
- validates facility existence in tenant DB
- ensures caller has access unless super admin
- returns:
  - `tenantId`
  - `facilityId`
  - `organizationId`

Error behavior:

- `401` for missing tenant context
- `409` with `Facility setup required` when no facility exists yet
- `400` for missing facility header after facilities exist
- `403` for unauthorized or nonexistent facility access

## 10.4 Permission Seeding

Initial seeded permissions in `tenant.service.ts`:

- `organizations:create`
- `facilities:create`
- `patients:read`
- `patients:create`
- `patients:update`
- `patients:delete`
- `appointments:read`
- `appointments:create`
- `appointments:update`
- `inventory:read`
- `inventory:create`
- `audit:read`

All seeded permissions are attached to `OWNER`.

## 10.5 Auth Cache Invalidation

Invalidation helpers exist for:

- single user auth context
- role-based invalidation
- permission-based invalidation
- entire tenant invalidation

These live in `src/lib/cache/invalidate.ts`.

## 11. Redis Usage

## 11.1 Redis Client

Defined in `src/lib/queue/redis.ts`.

Behavior:

- uses `ioredis`
- `lazyConnect: true`
- `enableReadyCheck: false`
- `maxRetriesPerRequest: null`
- enables TLS automatically for `rediss://`

## 11.2 Redis Responsibilities

Redis is used for:

- auth context caching
- auth cache indexing by tenant
- rate limiting
- BullMQ queue transport
- audit aggregation
- anomaly detection counters
- alert dedupe
- alert rate limiting

## 11.3 Fallback Behavior

Implemented behavior today:

- auth cache read failures return null and trigger DB fallback
- auth cache write failures are logged but not fatal
- rate limit failures fail open
- audit analytics Redis reads fall back to Postgres rollup
- anomaly detection failures return no anomaly
- alert dispatch failures are logged and do not break request flow
- audit queue enqueue failures fall back to best-effort direct audit persistence

## 12. Audit System

## 12.1 Tenant Audit Logger

Implemented in `src/lib/audit/logger.ts`.

`auditLog(req, input)`:

- reads user and tenant from injected headers
- safely parses permissions snapshot from header JSON
- collects:
  - action
  - resource
  - resourceId
  - permissionUsed
  - facilityId
  - organizationId
  - isSuperAdmin
  - permissionsSnapshot
  - IP
  - user agent
- forwards payload to the audit queue

## 12.2 Audit Queue

Implemented in `src/lib/audit/queue.ts`.

- BullMQ queue name: `audit-log`
- Prefix: `tenorix`
- Job retries:
  - `attempts: 3`
  - exponential backoff
- On enqueue failure:
  - schedules `writeAuditLog` via `queueMicrotask`
  - persists minimal event directly to tenant DB

## 12.3 Audit Writer

Implemented in `src/lib/audit/writer.ts`.

Writes one row to tenant `audit_logs` with normalized nullable fields.

## 12.4 Audit Aggregation

Implemented in `src/lib/audit/aggregator.ts`.

Redis keys per tenant and date:

- `audit:{tenantId}:{date}:users`
- `audit:{tenantId}:{date}:actions`
- `audit:{tenantId}:{date}:resources`
- `audit:{tenantId}:{date}:facilities`
- `audit:{tenantId}:{date}:total`

Aggregation retains up to 7 days in Redis.

## 12.5 Audit Rollup

Implemented in `src/lib/audit/rollup.ts` and `src/workers/audit.rollup.worker.ts`.

Behavior:

- fetches aggregate counters from Redis
- normalizes numeric data
- upserts into `AuditDailyAggregate`
- unique key is `[tenantId, date]`

The rollup worker iterates over all tenants in `ONBOARDING` or `ACTIVE`.

## 12.6 Anomaly Detection

Implemented in `src/lib/audit/anomaly.ts`.

Rules currently included:

- burst activity over 100 actions in 60 seconds
- excessive `DELETE` operations over 20 in 60 seconds
- read spike over 200 `READ` actions in 60 seconds

If Redis operations fail, anomaly detection returns `null` and the pipeline continues.

## 12.7 Control Audit

Implemented in `src/lib/audit/control.ts`.

This is separate from tenant audit logging and stores platform-level events in the control DB, especially for auth flows.

Currently used for:

- `AUTH_REGISTER_SUCCESS`
- `AUTH_REGISTER_FAILED`
- `AUTH_LOGIN_SUCCESS`
- `AUTH_LOGIN_FAILED`
- `AUTH_LOGOUT_SUCCESS`

## 13. Alert, Risk, and Behavior Pipeline

## 13.1 Alert Dispatch

Implemented in `src/lib/alert/dispatcher.ts`.

Behavior:

- dedupes alerts per `tenantId + userId + type` for 60 seconds
- rate limits to 5 alerts per user per minute
- enqueues to BullMQ queue `alert-queue`

If Redis fails, alert dispatch logs the error and exits safely.

## 13.2 Alert Worker

Implemented in `src/workers/alert.worker.ts`.

For each alert:

1. Persist to tenant `audit_alerts`
2. Update user risk score
3. Update user behavior profile
4. Send Slack alert
5. Send email alert
6. Send webhook alert

## 13.3 Alert Providers

### Slack

`src/lib/alert/providers/slack.ts`

- Uses `SLACK_WEBHOOK_URL`
- Sends formatted attachment payload to Slack

### Email

`src/lib/alert/providers/email.ts`

- Uses `RESEND_API_KEY`
- Sends a simple HTML alert email
- Currently hardcodes sender and recipient placeholders

### Webhook

`src/lib/alert/providers/webhook.ts`

- Loads active webhook endpoints from control DB `AlertWebhook`
- Sends `audit.alert` event payloads to configured URLs

## 13.4 Risk Engine

Implemented in `src/lib/risk/engine.ts`.

Risk score increments by alert severity:

- `CRITICAL`: 50
- `HIGH`: 25
- `MEDIUM`: 10
- default: 5

## 13.5 Behavior Profiling

Implemented in `src/lib/behavior/profile.ts`.

Current behavior model is simplified:

- upserts user profile
- increments `avgActionsPerMinute` by `1` per alert

This is a placeholder-style baseline, not a sophisticated behavioral analytics engine yet.

## 14. API Documentation

## 14.1 Auth APIs

### `POST /api/auth/register`

Purpose:

- Register a new control user
- Create a tenant
- Provision tenant infrastructure

Body:

```json
{
  "email": "owner@example.com",
  "password": "secret123",
  "name": "Clinic Owner",
  "tenantName": "Sunrise Health"
}
```

Success response:

```json
{
  "success": true,
  "tenantId": "tenant_id",
  "tenantStatus": "ONBOARDING"
}
```

### `POST /api/auth/login`

Purpose:

- Authenticate a control user
- Resolve accessible tenant and onboarding status
- Set auth cookie

Body:

```json
{
  "email": "owner@example.com",
  "password": "secret123"
}
```

Success response when one tenant is accessible:

```json
{
  "success": true,
  "activeTenantId": "tenant_id",
  "tenantStatus": "ONBOARDING",
  "requiresOrganizationSetup": true,
  "requiresFacilitySetup": true,
  "accessibleFacilityIds": []
}
```

### `GET /api/auth/me`

Purpose:

- Inspect current session and access context

Requires:

- `auth_token` cookie

### `POST /api/auth/logout`

Purpose:

- Clear auth cookie
- Best-effort invalidate auth cache
- Best-effort write control audit logout event

## 14.2 Onboarding APIs

### `POST /api/organizations`

Purpose:

- Create organization inside tenant DB

Requires:

- authenticated request through proxy
- permission `organizations:create`

Body:

```json
{
  "name": "Sunrise Healthcare Group"
}
```

### `POST /api/facilities`

Purpose:

- Create facility inside tenant DB
- Promote tenant from `ONBOARDING` to `ACTIVE`
- Assign facility-scoped OWNER role to creator

Requires:

- permission `facilities:create`

Body:

```json
{
  "organizationId": "org_id",
  "name": "Sunrise Clinic Downtown",
  "type": "CLINIC",
  "address": "12 MG Road, Bangalore"
}
```

## 14.3 Business APIs

### `POST /api/patients`

Purpose:

- Create patient within a facility

Requires:

- permission `patients:create`
- header `x-facility-id`
- facility access

Body:

```json
{
  "name": "Jane Doe",
  "gender": "Female",
  "dob": "1990-01-01T00:00:00.000Z",
  "phone": "9999999999",
  "email": "jane@example.com",
  "address": "City Center"
}
```

If no facilities exist yet, product APIs using `requireFacilityContext` return:

```json
{
  "success": false,
  "error": "Facility setup required"
}
```

with status `409`.

## 14.4 Tenant Audit Read APIs

All of the following require tenant auth and permission `audit:read`:

### `GET /api/audit-logs`

Supports:

- `limit`
- `cursor`
- `action`
- `userId`
- `permission`
- `from`
- `to`

Applies facility scoping for non-super-admin users.

### `GET /api/audit-analytics`

Returns audit aggregate data for a specific date.

Supports:

- `date`

Reads Redis first, then falls back to `AuditDailyAggregate`.

### `GET /api/audit-analytics/trends`

Returns daily rollup rows.

Supports:

- `days`

### `GET /api/audit-analytics/top-users`

Returns top audited users via group-by.

### `GET /api/audit-analytics/permissions`

Returns most-used permissions from audit logs.

### `GET /api/audit-insights`

Returns:

- suspicious high-activity users
- top permissions
- simple excessive delete flag

### `GET /api/alerts`

Returns paginated audit alerts.

Supports:

- `limit`
- `cursor`
- `severity`
- `type`
- `userId`
- `from`
- `to`

### `GET /api/risk`

Returns top user risk scores.

### `GET /api/behavior`

Returns top behavior profiles.

### `GET /api/security/insights`

Returns a combined security dashboard payload containing:

- recent alerts
- top risk users
- high activity users

## 14.5 Control Audit API

### `GET /api/control-audit`

Purpose:

- Read control-plane audit logs, especially auth events

Auth behavior:

- reads `auth_token` cookie directly
- verifies token
- validates current tenant membership in control DB
- only allows `OWNER` or `ADMIN`

Supports:

- `limit`
- `cursor`
- `action`
- `userId`
- `from`
- `to`

This API is separate from tenant audit APIs because auth events are not written into tenant audit logs.

## 15. Queue and Worker Model

## 15.1 BullMQ Queues

### Audit Queue

- name: `audit-log`
- prefix: `tenorix`

### Alert Queue

- name: `alert-queue`
- prefix: `tenorix`

## 15.2 Workers

### `src/workers/audit.worker.ts`

Consumes audit jobs and performs:

- DB audit write
- Redis aggregation
- anomaly detection
- alert dispatch

### `src/workers/alert.worker.ts`

Consumes alert jobs and performs:

- alert persistence
- risk update
- behavior update
- outbound notifications

### `src/workers/audit.rollup.worker.ts`

Runs rollups across tenant aggregate data.

## 16. Prisma and Client Access Patterns

## 16.1 Control Prisma

`src/lib/prisma/control.ts`

- creates a singleton-ish Prisma client
- uses `@prisma/adapter-pg`
- caches in global object in development

## 16.2 Tenant Prisma

`src/lib/prisma/tenant.ts`

- lazily resolves tenant DB URL from control DB
- creates Prisma clients per tenant
- caches clients in-memory
- deduplicates concurrent client initialization with `pendingTenantClients`

This design prevents duplicate Prisma client creation under concurrent access for the same tenant.

## 17. Rate Limiting

Implemented in `src/lib/security/rate-limit.ts`.

Current explicit rate-limited flows:

- registration
- login
- organization creation
- facility creation

Behavior:

- Redis `INCR` + `EXPIRE`
- returns `429` if limit exceeded
- if Redis fails, rate limiting fails open

## 18. Generated Artifacts

Generated Prisma client output lives under:

- `src/generated/control`
- `src/generated/tenant`

These include:

- `client.ts`
- `browser.ts`
- enums
- internal runtime helpers
- generated model types

They should not be manually edited.

## 19. Existing Documentation Files

### `docs/Architecture.md`

Contains high-level architecture notes and domain intent. Parts are conceptually useful, but some sections still describe future-state concepts rather than the exact current implementation.

### `docs/AUTH_RBAC_ARCHITECTURE.md`

This file predates the current auth refactor and no longer fully matches the implemented system. Examples of drift:

- it still describes permissions in JWT
- it still references `x-role`
- it still says there are no DB calls during request auth rebuild

Use this `PROJECT_CONTEXT.md` document as the source of truth for the current implementation.

## 20. Known Behaviors and Operational Notes

- The system uses `src/proxy.ts`, not `middleware.ts`.
- Auth routes bypass proxy on purpose.
- Control audit and tenant audit are separate by design.
- Facility creation is the activation step that moves tenant status to `ACTIVE`.
- Tenant audit reads are facility-filtered for non-super-admin users.
- Control audit reads are governed by control membership role.
- Queue enqueue failures do not block request completion.
- Some downstream integrations, especially email recipients and Slack formatting, are still simplistic.
- `src/lib/rbac/cache.ts` exists but the primary runtime authorization path now relies on auth context caching instead.
- The frontend is minimal; most of the implemented value is in APIs and infra.

## 21. Current Limitations and Gaps

- `REDIS_URL` must still exist at startup even though many Redis operations degrade gracefully at runtime.
- Email alert delivery still uses placeholder sender and recipient values.
- There is no tenant selection completion route yet for multi-membership login responses.
- Business modules beyond patients are not yet implemented even though some permissions are seeded.
- `AuditAnomaly` exists in schema, but the current anomaly path dispatches alerts rather than persisting explicit anomaly rows.
- The behavior profiling logic is intentionally simplistic.
- `docs/AUTH_RBAC_ARCHITECTURE.md` is outdated.
- Production `next build` can fail in restricted-network environments if external Google Fonts are fetched from `src/app/layout.tsx`.

## 22. Recommended Local Development Flow

1. Set environment variables:
   - `CONTROL_URL`
   - `TENANT_URL`
   - `POSTGRES_BASE_URL`
   - `REDIS_URL`
   - `JWT_SECRET`
2. Generate Prisma clients:
   - `npm run prisma:control:generate`
   - `npm run prisma:tenant:generate`
3. Run migrations if needed:
   - `npm run prisma:control:migrate`
   - `npm run prisma:tenant:migrate`
4. Start the app:
   - `npm run dev`
5. Start workers as needed:
   - `npm run worker:audit`
   - alert worker and rollup worker are present and can be run separately if desired

## 23. Practical End-to-End Flow

Typical happy path:

1. Register via `/api/auth/register`
2. Login via `/api/auth/login`
3. Create organization via `/api/organizations`
4. Create facility via `/api/facilities`
5. Call `/api/auth/me` to confirm:
   - `tenantStatus = ACTIVE`
   - onboarding flags resolved
6. Create patient via `/api/patients` with:
   - auth cookie
   - `x-facility-id` header
7. Inspect tenant audit via `/api/audit-logs`
8. Inspect auth events via `/api/control-audit`

## 24. Summary

ClinicOS is currently a backend-heavy, tenant-isolated, security-oriented SaaS foundation with:

- control-plane identity and tenant management
- per-tenant databases
- proxy-injected auth context
- permission-based RBAC with facility scoping
- onboarding through organization and facility creation
- async tenant audit logging
- separate control-plane auth audit logs
- Redis-backed cache, rate limiting, aggregation, dedupe, and queues
- alerting, risk scoring, and behavior profiling

This document reflects the implemented project state as of the current repository snapshot and should be treated as the main project context document.

## 25. Patient Module (Detailed Documentation)

The Patient module is the first fully implemented business module in the system and serves as the foundation for all future healthcare workflows such as appointments, encounters, and medical records.

It is designed with:

strict facility-level isolation
RBAC enforcement
audit logging integration
duplicate prevention
soft deletion strategy
bulk operations support

### 25.1 Data Model

Defined in `prisma/tenant/schema.prisma`:

```json
model Patient {
  id String @id @default(uuid())

  facilityId String

  name   String
  gender Gender
  dob    DateTime?

  phone   String?
  email   String?
  address String?

  isDeleted Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([facilityId, createdAt])
  @@index([facilityId])
  @@index([createdAt])
  @@index([name])
}
```
  Key Design Decisions
  - Facility-scoped: every patient belongs to exactly one facility
  - Soft delete enabled via isDeleted
  - Indexed for performance on:
    - facility queries
    - listing
    - search

### 25.2 Access Control

All patient APIs require:
  - authenticated request (via proxy.ts)
  - valid auth context headers
  - RBAC permission checks via requireAccess
  - facility validation via requireFacilityContext

Required Permissions
  - patients:create
  - patients:read
  - patients:update
  - patients:delete

Isolation Guarantees
  - All queries include facilityId
  - Non-super-admin users are restricted to their assigned facilities
  - Cross-facility data access is prevented at query level

### 25.3 Create Patient API
POST `/api/patients`

Creates a new patient within a facility.

Validation
  - Uses Zod schema
  - Ensures valid structure and types

Duplicate Detection
  Before insertion:
  - Checks for existing patient with:
    - same phone OR
    - same (name + dob)

    ```json
      OR: [
            { phone: input.phone },
            {
              AND: [
                { name: input.name },
                { dob: input.dob }
              ]
            }
          ]
    ```

  Behavior
    - Rejects duplicate with structured response
    - Creates patient otherwise
    - Writes audit log

  Audit Event
  ```json
    auditLog(req, {
      action: "patients:create",
      resource: "Patient",
      resourceId: patient.id,
      permissionUsed: "patients:create",
      facilityId,
      organizationId
    });
  ```

### 25.4 Read Patients API
  GET `/api/patients`

  Supports:
    - pagination
    - filtering
    - search

  Query Behavior
    - Always filters by:
    - facilityId
    - isDeleted = false

  Search
    - case-insensitive name search
    - partial phone match

### 25.5 Update Patient API
PATCH `/api/patients/:id`

Updates patient fields safely.
Safety Guarantees
  - ensures patient belongs to facility
  - prevents updates on deleted records
  - maintains audit trail

### 25.6 Soft Delete Patient
DELETE `/api/patients/:id`

Implements soft deletion:
```json
  isDeleted = true
```

Behavior
  - verifies facility ownership
  - prevents deleting already deleted records
  - logs audit event

Audit Event
```json
  action: "patients:delete"
```

### 25.7 Bulk Create Patients
POST `/api/patients/bulk-create`

Supports batch creation of up to 100 patients.

Features
  - per-record validation
  - duplicate detection:
    - within batch
    - against database
  - partial success response

Response Structure
```json
    {
      "success": true,
      "results": [
        { "success": true, "data": {...} },
        { "success": false, "error": "Duplicate in DB" }
      ]
    }
```

Performance Considerations
  - avoids single massive insert to preserve validation integrity
  - prevents DB overload via batch size limit

Audit
Single aggregated audit event:
```json
    action: "patients:bulk_create"
    metadata: {
      total,
      created
    }
```

### 25.8 Bulk Soft Delete
POST `/api/patients/bulk-delete`

Soft deletes multiple patients.

Behavior
  - validates IDs
  - enforces facility scope
  - uses updateMany for performance

```json
    where: {
      id: { in: ids },
      facilityId,
      isDeleted: false
    }
```

Response
{
  "success": true,
  "deleted": 25
}

Audit
action: "patients:bulk_delete"
metadata: {
  requested,
  deleted
}

### 25.9 Facility Context Dependency

All patient APIs depend on:
`requireFacilityContext(req)`

Behavior
ensures tenant isolation
ensures facility exists
enforces access control
blocks access during onboarding

Error Cases
401 → missing auth
409 → no facility created yet
400 → facility header missing
403 → unauthorized facility access

### 25.10 Audit Integration

Every patient operation is audited via:
async queue (BullMQ)
Redis aggregation
anomaly detection
alert pipeline

Captured fields include:
userId
facilityId
organizationId
action
resource
resourceId
permissionUsed
IP + userAgent

25.11 Security Considerations
No cross-tenant queries
Strict facility-level filtering
No trust in client-provided data
Auth context injected server-side only
Duplicate detection prevents data corruption
Soft delete prevents data loss
Rate limiting protects APIs

25.12 Performance Considerations

- Indexed queries for:
  - facilityId
  - createdAt
  - name

- Bulk operations use optimized queries
- Redis-backed audit aggregation reduces DB load
- Async audit pipeline prevents request blocking

25.13 Current Limitations
No patient merge functionality yet
No global patient identity resolution
No advanced search (full-text / fuzzy)
No CSV import pipeline yet

25.14 Future Enhancements
patient deduplication engine
identity resolution across facilities
medical history linkage
EMR integration
appointment linkage
patient risk scoring

25.15 Summary

The Patient module is a production-ready, secure, and scalable foundation for healthcare data management.

It provides:

strict data isolation
strong access control
auditability
scalability via bulk operations
extensibility for future clinical modules

## 26. Doctor Module

The Doctor module introduces structured clinical staff management with facility-scoped access, multi-organization assignment, and secure onboarding via invites.

### 26.1 Data Model

Core entities:

- Doctor (global per tenant)
- DoctorFacility (mapping table)
- DoctorInvite (onboarding flow)

Key characteristics:

- A doctor can belong to multiple facilities and organizations
- Doctor identity is separate from authentication (linked later via invite)
- Facility-level configuration (fees, timings) stored in mapping table

### 26.2 Capabilities

- Create doctor profile without login account
- Assign doctor to one or more facilities
- Configure:
  - consultation fee
  - timing
  - duration
- Update / deactivate doctor
- Facility-scoped listing

### 26.3 Access Control

Permissions:

- doctors:create
- doctors:read
- doctors:update
- doctors:delete

All APIs enforce:

- requireAccess
- requireFacilityContext
- audit logging

### 26.4 Audit Coverage

Every mutation logs:

- doctor creation
- updates
- facility assignment
- deactivation

---

## 27. Doctor Invite System

Secure onboarding system for doctors using email-based invites.

### 27.1 Flow

1. Admin creates invite
2. Token generated (one-time, hashed)
3. Email sent via Resend
4. Doctor accepts invite via public endpoint
5. Account created in control DB
6. Linked to tenant + doctor record
7. Roles assigned

### 27.2 Security Design

- Token stored as SHA-256 hash
- Constant-time comparison
- Expiry enforced
- Single-use token
- Rate limited endpoint

### 27.3 Failure Handling

- Email failure → transaction rollback
- Cross-DB failure → compensation logic
- Invite marked only after full success

### 27.4 Access Model

- Doctors get restricted access:
  - only assigned organizations
  - only assigned facilities

---

## 28. Appointment System

The appointment system is a concurrency-safe scheduling engine with timezone awareness and Redis-backed caching.

### 28.1 Core Features

- Slot generation
- Conflict-free booking
- Facility + doctor validation
- Timezone-aware scheduling
- Session-based availability

### 28.2 Concurrency Safety

Booking uses:

- pg_advisory_xact_lock
- SERIALIZABLE transactions
- overlap checks

Guarantees:

- no double booking
- safe under high concurrency

### 28.3 Slot Engine

Supports:

- multiple daily sessions
- buffer time (before/after)
- timezone conversion
- busy interval subtraction

### 28.4 Redis Optimization

- Slot caching per:
  tenant + facility + doctor + date + timezone
- Automatic invalidation on:
  - booking
  - cancel
  - update

### 28.5 APIs

- POST /api/appointments
- GET /api/appointments
- GET /api/appointments/slots
- PATCH /api/appointments/:id
- DELETE /api/appointments/:id

---

## 29. Billing System (Ledger-First)

The billing system is implemented using an append-only financial ledger.

### 29.1 Core Principle

No totals are stored.

Everything is derived from:

- CHARGE
- PAYMENT
- REFUND
- DISCOUNT
- TAX
- WRITE_OFF

### 29.2 Design Guarantees

- Immutable financial history
- Auditability
- No silent mutations
- Accurate recomputation

### 29.3 Capabilities

- Draft billing
- Add items
- Apply discounts
- Apply taxes
- Partial payments
- Split payments
- Refunds
- Write-offs
- Finalization

### 29.4 Concurrency

- Advisory locks per billing record
- Serializable transactions
- Idempotency keys for payments

### 29.5 Money Handling

- Decimal(18,2)
- No floating point errors

---

## 30. Invoice System

Immutable snapshot system built on top of billing.

### 30.1 Key Concepts

- One invoice per billing
- Snapshot of:
  - items
  - totals
  - taxes
  - payments

### 30.2 Features

- HTML rendering
- PDF generation (@react-pdf/renderer)
- Facility-based invoice numbering
- GST support (optional)

### 30.3 Immutability

Once generated:

- cannot be modified
- reflects ledger state at generation time

---

## 31. Financial Reporting System (Planned Architecture)

The reporting system converts ledger data into actionable business insights.

### 31.1 Architecture

```text
Ledger → Aggregation → Reports → Dashboard
```
### 31.2 Aggregation Strategy

Recommended:

Daily rollup tables
model FinancialDailyAggregate {
  id String @id @default(uuid())

  date DateTime
  facilityId String

  revenue Float
  tax Float
  discount Float
  refunds Float
  writeOff Float
  netRevenue Float

  createdAt DateTime @default(now())

  @@unique([date, facilityId])
}

### 31.3 Core Reports
Revenue summary
Profit & Loss (P&L)
Doctor earnings
Facility performance
Service revenue
Payment method distribution
Outstanding dues
Daily collections
Patient LTV
Tax reporting
### 31.4 Performance Strategy
Pre-aggregation (daily)
Redis caching (60–300s TTL)
Indexed queries
### 31.5 Security
Facility-scoped filtering
RBAC enforced (reports:read)
No cross-tenant aggregation
### 31.6 Edge Cases
Refund timing mismatch
Partial payments
Cancelled bills
Backdated entries
Timezone boundaries

## 32. System Evolution Summary

The platform has evolved from:

Infra → Security → Intelligence → Product → Financial System

Current state:

Fully multi-tenant
Secure RBAC system
Audit + alert intelligence layer
Clinical modules (patients, doctors, appointments)
Financial system (billing, invoices)
Ready for reporting and analytics layer

This positions the system as:

“An intelligent, secure, multi-tenant healthcare operating system”