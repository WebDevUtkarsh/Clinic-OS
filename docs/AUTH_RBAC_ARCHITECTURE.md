# ClinicOS – Authentication & RBAC Architecture

## Overview

This document defines how authentication and authorization work in ClinicOS.

The system uses:

* JWT-based authentication
* Header-based context propagation
* Role + Permission-based access control (RBAC)
* Facility-scoped authorization

---

## 🔐 Authentication Flow

1. User logs in
2. System:

   * validates credentials
   * loads tenant membership
   * loads permissions + facility access
3. JWT is issued with:

{
userId,
tenantId,
role,
permissions[],
facilityIds[],
isSuperAdmin
}

4. JWT is stored in HttpOnly cookie

---

## 🔁 Request Lifecycle

1. Client sends request with cookie
2. Middleware:

   * verifies JWT
   * extracts payload
   * injects headers:

Headers:

x-user-id
x-tenant-id
x-role
x-permissions
x-facilities
x-super-admin

3. API route reads headers
4. RBAC guard enforces access

---

## 🧠 Authorization Model

### Type: Hybrid RBAC

* Role-based (OWNER, DOCTOR, STAFF)
* Permission-based (patients:read)
* Context-aware (facility-level)

---

## 🔐 Permission Model

Permissions are string-based:

patients:read
patients:create
appointments:update

---

## 🏥 Facility Scope

Some permissions require facility-level validation.

Example:

requireAccess({
permission: "patients:read",
facilityScoped: true
})

This enforces:

* user must have permission
* user must belong to that facility

---

## 🔥 Super Admin

If:

isSuperAdmin = true

Then:

* bypass all RBAC checks
* full system access

---

## ⚡ Performance Design

* Permissions are embedded in JWT
* No DB calls during request
* O(1) authorization checks

---

## ⚠️ Critical Rules

* NEVER access tenant DB during authentication
* ALWAYS use requireAccess() in protected routes
* NEVER trust frontend for authorization
* NEVER bypass middleware
* NEVER expose DB URLs

---

## 🧩 Example Flow

GET /api/patients

→ Middleware validates JWT
→ Headers injected
→ requireAccess("patients:read")
→ Access granted

---

## 🛑 Failure Cases

| Case               | Result |
| ------------------ | ------ |
| Missing token      | 401    |
| Invalid token      | 401    |
| Missing permission | 403    |
| Wrong facility     | 403    |

---

## 📌 Future Extensions

* ABAC (attribute-based access)
* Time-based permissions
* Emergency access override
* Audit logging (next step)

---

## Summary

This system ensures:

* Strong tenant isolation
* Fine-grained access control
* High performance (no DB per request)
* Audit-ready structure
