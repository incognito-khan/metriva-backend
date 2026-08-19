# Metriva — Project Context & Roadmap (Living Document)

**Last Updated:** Aug 20, 2026
**Current Phase:** Phase 2 — Backend Tasks 1–8 DONE · Task 9 (Frontend Phase-2 UI) = NEXT
**Backend (active):** `backend-nestjs/` (NestJS + TypeScript)
**Behavioral source of truth (auth):** `backend/` (Express) — read-only reference
**Frontend:** `frontend/` (Next.js 16) — ON HOLD until Task 8 done
**Product spec:** `Metriva Documentation.pdf` (18 phases)

---

## 0. HOW TO USE THIS FILE

- **New AI chat:** attach this file + repo, then say: _"Read PROJECT_CONTEXT.md fully, then execute: [TASK NAME]"_.
- **After each task:** update §6 (progress), §7 (issues), and Last Updated.
- **Hard rules for ANY AI:**
  - Do NOT modify `backend/` or `frontend/` unless the task explicitly says so.
  - Do NOT rename/paraphrase any message in §5 (exact-string contract).
  - NEVER hard delete (soft deletes only).
  - All authorization checks server-side; never trust client body for org scoping.

## 1. PRODUCT OVERVIEW

Local SEO Revenue Attribution SaaS for agencies: agencies manage multiple business clients, connect Google data, and attribute leads/revenue to local SEO. PDF phases: 1 Auth ✅ → 2 Agency/Client Mgmt (current) → 3–16 integrations/analytics → 17 Client Access → 18 sync/hardening.

## 2. REPOSITORY STRUCTURE (AS-IS)

```
metriva/
├── backend/            # Express (Phase-1 auth) — REFERENCE ONLY
├── backend-nestjs/     # ACTIVE — Tasks 1-7 DONE
│   └── src/
│       ├── auth/          ✅ 10 endpoints, cookies, OTP, reset
│       ├── users/         ✅ POST/GET/GET:id (agency user mgmt)
│       ├── organizations/ ✅ CRUD + transaction + default roles
│       ├── clients/       ✅ CRUD + isolation + pagination
│       ├── roles/         ✅ custom roles + assignments + permissions
│       ├── seed/          ✅ superadmin + demo org + system roles
│       ├── common/        ✅ guards/decorators/filter/utils/logger
│       ├── config/ · email/
│       └── main.ts · app.module.ts
└── frontend/           # Next.js 16 auth UI — ON HOLD
```

## 3. ROLE & PERMISSION MODEL

- **Enum roles (User.role):** `SUPER_ADMIN` (platform, all access) · `AGENCY_ADMIN` (own org full control) · `CLIENT_USER` (Phase 17).
- **System Role docs (per org, isSystem:true):** `Admin` (all perms) + `Viewer` (read-only) — auto-created on org creation & seed; update/delete → 403.
- **Custom roles:** agency-scoped, created by AGENCY_ADMIN; unique name per org; permissions validated against FIXED list.
- **RoleAssignment:** user+role+organization(+optional client), all same-org enforced.
- **FIXED PERMISSIONS:** clients:read, clients:write, clients:delete, leads:read, leads:write, leads:delete, revenue:read, revenue:write, reports:read, reports:export, seo:read, settings:read, settings:write.

## 4. ARCHITECTURE DECISIONS (LOCKED)

| Area         | Decision                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| Backend      | NestJS (team-lead decision; PDF said Next.js Route Handlers — overridden)                                     |
| Auth         | JWT in HttpOnly cookies; access 15m `type:'access'`; refresh 7d `type:'refresh'`; prod secure+strict, dev lax |
| DB           | MongoDB + Mongoose; transactions for org+admin+roles creation                                                 |
| Soft deletes | org→`suspended`, client→`inactive`; roles hard-delete allowed ONLY if no assignments                          |
| Isolation    | Server-side everywhere (guards + services)                                                                    |
| Guard order  | JwtAuthGuard → RolesGuard → (OrgAccess/ClientAccess as needed)                                                |

## 5. API CONTRACT (EXACT — do not deviate)

**Envelope:** `{ "success": bool, "message": string, "data": object? }`
**Validation errors (MUST be ARRAY):**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email format" }]
}
```

**Exact messages:** login bad creds `"Invalid email or password"` 401 · login unverified `"Please verify your email before logging in."` **403** · duplicate email `"An account with this email already exists"` 409 · forgot-password always 200 generic · bad reset token `"Invalid or expired password reset token."` 400 · org denied `"You do not have access to this organization"` 403 · client denied `"You do not have access to this client"` 403 · permission denied `"You do not have permission to perform this action"` 403 · system role `"System roles cannot be modified"` / `"System roles cannot be deleted"` 403.
**AssignRoleDto field names (project convention):** `user`, `role`, `client?` (frontend must use these).

## 6. PHASE 2 PROGRESS

- [x] Task 1 NestJS scaffold · [x] Task 2 Auth migration · [x] Task 3 RBAC infra · [x] Task 4 Organizations+seed (Aug 18–19)
- [x] Task 5 Clients (Aug 19) · [x] Task 6 Custom Roles+tests (Aug 19) · [x] Task 7 System roles + agency user mgmt (Aug 20)
- [x] **Task 8 — Gap-Fix (Aug 20)**
- [ ] Task 9 — Frontend Phase-2 UI (NEXT)

## 7. KNOWN ISSUES / DEVIATIONS

All issues from Task 8 have been resolved. No known deviations remain.

## 8. ROADMAP

1. **DONE:** Task 8 gap-fix (backend) — all validation errors, auth messages, and permission messages now match contract.
2. **NEXT:** Task 9 frontend Phase-2 UI (superadmin: agencies list/create; agency: clients/roles/users pages; role-aware routing).
3. **LATER:** PDF Phases 3–18.

## 9. CREDENTIALS & COMMANDS

- Superadmin: `admin@metriva.com` / `SuperAdmin@123!` (env-overridable)
- Demo agency admin: `admin@demo.com` / `DemoAdmin@123!` (org: Demo Agency)
- `pnpm install` · `pnpm build` · `pnpm start:dev` · `pnpm seed` · tests: `backend-nestjs/metriva-api-test.http`

## 10. APPENDIX — EXECUTION HISTORY

Tasks 1–7 prompts are **retired** (implemented & verified). Full prompt archive lives in original chat history. Only active prompts are kept in this file (see Execution Prompt given alongside this file).
