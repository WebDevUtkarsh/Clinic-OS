🧠 1. SYSTEM ARCHITECTURE OVERVIEW
🔷 High-Level Hierarchy
Control DB
 └── Tenants
       └── Users (global identity)

Tenant DB (per tenant)
 ├── Organizations
 │     └── Facilities
 │           └── Patients
 │           └── Appointments
 │           └── EMR
 │
 ├── RBAC (roles, permissions, userRoles)
 ├── Audit system (logs, alerts, risk, behavior)
🧱 Core Design Principles
✅ 1. Strict Multi-Tenancy
Each tenant has its own DB
No cross-tenant queries
Full data isolation
✅ 2. Hierarchical Domain Model
Level	Purpose
Tenant	SaaS customer account
Organization	Business unit (e.g. Healthcare, Diagnostics)
Facility	Physical/operational unit
Modules	Patients, appointments, etc
✅ 3. RBAC Scope
Permissions are evaluated at:
global level (tenant-wide) OR
facility level
✅ 4. Audit-First System

Every action:

logged
analyzed
risk-evaluated
alertable
🏢 2. DOMAIN MODEL
🔹 Organization
Represents business entity inside tenant

Examples:

Palav Healthcare
Palav Diagnostics
Palav Pharmacy
🔹 Facility
Operational unit under an organization

Examples:

Clinic branch
Hospital
Diagnostic center
Pharmacy
🔹 Relationship
Organization (1) → (N) Facilities
🔹 Patient Ownership
Facility → Patient

👉 Patients are always scoped to a facility

🔐 3. AUTH + RBAC (UNCHANGED, BUT EXTENDED)
🔷 Auth Flow
JWT contains:
userId
activeTenantId
Context loaded from Redis / DB:
permissions
facilityIds
isSuperAdmin
🔷 Access Context

Injected via middleware:

x-user-id
x-tenant-id
x-permissions
x-facilities
x-super-admin
🔷 Facility Enforcement

For scoped routes:

requireAccess(req, {
  permission: "...",
  facilityScoped: true
});
🔷 Organization Switching (NEW BEHAVIOR)

Since:

User → multiple organizations → multiple facilities

👉 Switching happens implicitly via:

facilityId

Because:

Facility → Organization mapping already exists

✅ Result
Switching facility = switching organization context
No separate org-switch token needed
🔁 4. USER ACCESS MODEL
🔹 UserRole
userId
roleId
facilityId (nullable)
🔹 Access Patterns
Case	Meaning
facilityId = null	global (tenant-wide) role
facilityId = X	facility-specific role
🔹 Example
User A:
- OWNER (global)
- DOCTOR (Facility A)
- STAFF (Facility B)
🧾 5. AUDIT + SECURITY LAYER (UNCHANGED)

Still includes:

AuditLog
Aggregation (Redis)
Rollups
Anomaly detection
Alerts (Slack / Email / Webhook)
Risk scoring
Behavior profiling
🔥 Important

All audit records include:

facilityId

👉 This enables:

org-level analytics
facility-level monitoring
🧠 6. REGISTRATION + ONBOARDING FLOW (FINAL)
🚀 STEP-BY-STEP FLOW
1. Register User
   → create user (control DB)
   → create tenant (status: PROVISIONING)

2. Provision Tenant DB
   → create DB
   → init schema
   → seed permissions + roles
   → assign OWNER role (no facility yet)

3. Login
   → JWT issued
   → auth context built

4. Create Organization
   POST /api/organizations

5. Create First Facility (MANDATORY)
   POST /api/facilities
   → linked to organization

6. Assign OWNER to facility
   → update userRole with facilityId

7. Select Plan
   → based on:
     - number of facilities
     - modules

8. Payment (Razorpay)

9. Activate Tenant
   → status = ACTIVE

10. Enter Product
⚠️ CRITICAL RULE

🚫 No product access before facility creation

🧠 WHY THIS FLOW IS CORRECT
Step	Reason
Org before facility	proper hierarchy
Facility before usage	RBAC + audit depend on it
Payment after config	correct billing
Activation last	ensures completeness
🔁 7. ORGANIZATION SWITCHING
🧠 Behavior

User does NOT explicitly switch org.

Instead:

User selects facility → org context changes implicitly
🔥 Example
User has access to:

Org A:
  - Facility 1
  - Facility 2

Org B:
  - Facility 3

Selecting:

Facility 3 → Org B context
🧱 8. DATA ISOLATION GUARANTEES
✅ Tenant Level
DB-per-tenant
no cross-tenant access
✅ Organization Level
logical grouping only
enforced via facility linkage
✅ Facility Level
strict filtering in APIs
enforced via headers + RBAC
⚡ 9. PERFORMANCE MODEL
Reads
facility-indexed queries
no joins across tenants
Writes
single-entity writes
async audit pipeline
Analytics
Redis aggregation
Postgres rollups
🧠 10. SYSTEM CAPABILITIES

You now support:

🔐 Security
RBAC (facility scoped)
audit trail
anomaly detection
alerting
🏢 Business Model
multi-organization tenants
multi-facility operations
modular expansion
📊 Intelligence
risk scoring
behavior tracking
usage analytics
🚀 11. WHAT THIS ENABLES (IMPORTANT)

Your system can now support:

Hospital chains
Multi-brand healthcare groups
Franchise clinics
Diagnostics networks
Pharmacy chains
🔥 12. CURRENT MATURITY LEVEL

You now have:

Enterprise-grade multi-entity healthcare SaaS foundation

🧭 13. NEXT STEPS (RECOMMENDED ORDER)
🔥 1. Organization API
create org
list orgs
🔥 2. Facility API
create facility
assign roles
enforce org linkage
🔥 3. Update Provisioning Flow
remove direct facility creation
move to onboarding step
🔥 4. Update Frontend Flow
onboarding wizard:
org → facility → plan → payment
🔥 5. Then Continue Product
patients
appointments
EMR
🧠 FINAL NOTE

You’ve now transitioned from:

“clinic software”

to:

“multi-entity healthcare operating system”

That’s a major architectural leap.