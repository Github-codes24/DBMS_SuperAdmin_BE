# Architecture Analysis & Parent–Child Project Integration Framework
**Platform Super Admin (Parent) & Local Trade Street (LTS Child Project)**

---

## Executive Summary

This document provides a comprehensive technical analysis of the **Platform Super Admin** parent architecture and the **Local Trade Street (LTS)** child ecosystem. It establishes a scalable, generic **Parent–Child Integration Framework** designed to onboard LTS as the initial child application, while providing standard plug-and-play architecture for all future child projects.

### Guiding Architectural Principles
1. **Zero Database Merging:** Child databases (`LTS-DBMS`) remain completely distinct from the parent database (`DBMS`). Data is accessed strictly through standardized, secure APIs.
2. **Autonomous Child Operations:** Child applications retain independent deployment lifecycles, business logic, role models, and local authentication fallbacks.
3. **Control Plane Governance:** Platform acts as the central registry, identity provider (SSO), cross-project auditor, and aggregated metric aggregator.
4. **Preservation of Git History:** All repositories will be integrated into unified monorepo structures using Git Subtree/Filter-Repo workflows without history loss.
5. **No Breaking Changes:** Existing production workflows on LTS (Render backend, Netlify frontends, Razorpay webhooks, Telecaller CRM) continue without interruption during and after migration.

---

## 1. Current Architecture Analysis

### 1.1 Repository & Technology Matrix

| Repository | Tech Stack | Port / Domain | Primary Role | State & Auth Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **`Platform FE`**<br>`(DBMS_SuperAdmin_FE)` | React 19.2, TypeScript 5.9, Vite 8.3, React Router v7, Centralized CSS Tokens | `5173`<br>*(Netlify)* | Central Control Plane Frontend | Context API (Theme, Toast), LocalStorage token (`dbms_auth_token`), centralized axios/fetch services |
| **`Platform BE`**<br>`(DBMS_SuperAdmin_BE)` | Node.js (CommonJS), TypeScript 5.9, Express 5.3, Mongoose 9.11, Zod, Helmet | `3007`<br>*(Render)* | Central Control Plane API | Multi-tenant RBAC, JWT (15-60m access + RefreshSession in DB with TTL), Token Versioning |
| **`LTS SuperAdmin FE`**<br>`(LTS-DBMS-Superadmin-panel)` | React 19.2, Vite 8.1, Tailwind CSS v4, Redux Toolkit, React Router v7 | `5174` / `5175`<br>*(Netlify)* | Child Project Admin Panel | Redux Toolkit, dual-token JWT (`accessToken` 8h + `refreshToken` 7d), Axios interceptors with refresh queue |
| **`LTS Vendor FE`**<br>`(LTS-DBMS-vendor-panel)` | React 19.2, Vite 8.2, Tailwind CSS v4, Redux Toolkit, React Router v7, Recharts | `5176`<br>*(Netlify)* | Child Vendor Store Portal | Redux Toolkit, `localStorage.getItem('token')`, Bearer token authorization |
| **`LTS Telecaller FE`**<br>`(LTS-DBMS-Telecaller-panel)` | React 19.2, Vite 8.1, Redux Toolkit, Oxlint, Custom CSS Modules | `5177`<br>*(Netlify)* | Child Telecaller CRM | Redux Toolkit, `localStorage.getItem('lts_telecaller_token')`, Razorpay payment link dispatch |
| **`LTS Backend`**<br>`(LTS-DBMS-backend-)` | Node.js (ESM), Express 5.2, Mongoose 9.9, JWT, bcryptjs, Razorpay, PDFKit, XLSX | `5000`<br>*(Render)* | Single Child Backend servicing all 3 frontends | Triple-scoped controllers (`/api/v1/superadmin/*`, `/api/v1/*`, `/api/*`, `/api/telecaller/*`) |

---

### 1.2 Database & Data Model Analysis

#### Platform Database (`DBMS` on MongoDB Atlas)
- **`projects` collection:** Defines project tenants. Fields: `projectId` (e.g. `PID-001`), `name`, `type` (`platform` vs `tenant`), `status` (`active`, `inactive`, `upcoming`, `completed`, `on_hold`), `panelLinks`, `userTypes`.
- **`users` collection:** Central platform identity. Contains global `role` (`superadmin`, `user`) and granular `projectRoles` array:
  ```json
  "projectRoles": [
    { "projectId": "ObjectId(Project)", "roleId": "ObjectId(Role)", "isActive": true }
  ]
  ```
- **`roles` collection:** Scoped by `projectId`. Contains `permissions` string array, `moduleKeys`, and `isSystem`.
- **`modules` collection:** Scoped by `projectId`. Unique compound index on `(projectId, key)`.
- **`audit_logs` collection:** Central security and configuration change tracking.
- **`refreshSessions` collection:** Ephemeral token sessions with automated MongoDB TTL expiry (`expireAfterSeconds: 0`).

#### LTS Database (`LTS-DBMS` on MongoDB Atlas)
- **`superadmins` collection:** Holds SuperAdmin identities with hashed passwords, OTP verification states, and refresh tokens.
- **`users` collection:** Holds operational users (`SUPER_ADMIN`, `ADMIN`, `TELECALLER`) with targets, leads, and status (`ACTIVE`, `INACTIVE`, `BLOCKED`).
- **`roles` & `permissionmatrices` collections:** Local matrix assigning 5 access dimensions (`fullAccess`, `viewAccess`, `editAccess`, `exportAccess`, `deleteAccess`) across 6 LTS business modules.
- **`vendors` collection:** Comprehensive vendor store records, categories, payment plans, KYC statuses, and coordinates.
- **`telecallers`, `paymentorders`, `plans`, `vendorfollowups` collections:** Direct CRM, Razorpay transaction records, and commission tracking.
- **`customers`, `products`, `orders`, `inventories` collections:** Full multi-vendor e-commerce domain data.

> [!IMPORTANT]
> **Data Independence Verification:** The Platform database and LTS database are hosted on distinct database instances within the MongoDB Atlas cluster (`/DBMS` vs `/LTS-DBMS`). Neither application currently shares connection pools, queries, or foreign keys. This strict physical separation must be preserved.

---

### 1.3 Authentication & Authorization Discrepancies

| Characteristic | Platform Control Plane | LTS Backend & Frontends | Architectural Gap |
| :--- | :--- | :--- | :--- |
| **Token Issuer** | `dbms-superadmin-api` | Local custom JWT / No standard issuer | Tokens cannot be validated cross-boundary without bridge |
| **Token Storage** | `dbms_auth_token` in `localStorage` | `accessToken` / `token` / `lts_telecaller_token` | Distinct keys across each frontend |
| **Session Model** | Token versioning + Database verification on every request | Long-lived refresh token in DB/Cookies | Platform can revoke instantly; LTS relies on token expiry |
| **Authorization Check** | RBAC middleware checks `projectRoles` array matching active route | Middleware checks `req.superAdmin` or `req.user.role` | Different identity payload shapes |
| **Password Hashing** | `bcryptjs` (salt 12) | `bcryptjs` (salt 10) | Standard bcrypt compatibility exists |

---

## 2. Proposed Target Architecture

### 2.1 The Parent–Child Topology

Platform operates as the **Central Control Plane (L1)**, and every registered child project (LTS, Future Project 2, Future Project 3) operates as an **Autonomous Tenant Domain (L2)**.

```
                             ┌──────────────────────────────────────────────┐
                             │          PLATFORM SUPER ADMIN                │
                             │             (Control Plane)                  │
                             │  • Global User Governance & Audit Log        │
                             │  • Central Project Registry & Health Monitor │
                             │  • Central SSO Identity Provider (IdP)       │
                             └──────────────────────┬───────────────────────┘
                                                    │
                 ┌──────────────────────────────────┴──────────────────────────────────┐
                 │ Signed Inter-Service Bridge Requests (HMAC / Service JWT)          │
                 │ Single Sign-On (SSO) Launch Handshake (Encrypted Ticket Exchange)  │
                 ▼                                                                     ▼
┌─────────────────────────────────────────┐                         ┌─────────────────────────────────────────┐
│     CHILD PROJECT 1: LTS ECOSYSTEM      │                         │     FUTURE CHILD PROJECT (Project N)    │
│                                         │                         │                                         │
│  ┌───────────────────────────────────┐  │                         │  ┌───────────────────────────────────┐  │
│  │   LTS Backend Bridge Adapter      │  │                         │  │  Child Project Bridge Adapter     │  │
│  │   /api/v1/platform-bridge/*       │  │                         │  │  /api/v1/platform-bridge/*        │  │
│  └─────────────────┬─────────────────┘  │                         │  └─────────────────┬─────────────────┘  │
│                    │                     │                         │                    │                     │
│  ┌─────────────────┴─────────────────┐  │                         │  ┌─────────────────┴─────────────────┐  │
│  │     LTS Domain Business Logic     │  │                         │  │     Child Domain Business Logic   │  │
│  │ (Vendors, Telecallers, E-commerce)│  │                         │  │   (Independent Domain Services)   │  │
│  └─────────────────┬─────────────────┘  │                         │  └─────────────────┬─────────────────┘  │
│                    │                     │                         │                    │                     │
│  ┌─────────────────┴─────────────────┐  │                         │  ┌─────────────────┴─────────────────┐  │
│  │   LTS Isolated Database           │  │                         │  │  Child Isolated Database          │  │
│  │   (MongoDB: LTS-DBMS)             │  │                         │  │  (Mongo / PostgreSQL / MySQL)     │  │
│  └───────────────────────────────────┘  │                         │  └───────────────────────────────────┘  │
│                                         │                         │                                         │
│  Frontends:                             │                         │  Frontends:                             │
│   • SuperAdmin Panel (Port 5174)        │                         │   • Child Admin Portal                  │
│   • Vendor Portal (Port 5176)           │                         │   • Child User App                      │
│   • Telecaller CRM (Port 5177)          │                         │                                         │
└─────────────────────────────────────────┘                         └─────────────────────────────────────────┘
```

---

## 3. Recommended Repository Architecture

### 3.1 Target Workspace Layout

Both frontend and backend will be consolidated into high-performance monorepos using **npm workspaces** and shared internal packages.

#### A. Frontend Monorepo (`DBMS_SuperAdmin_FE`)
```
DBMS_SuperAdmin_FE/
├── apps/
│   ├── platform-admin/              # Current Platform Super Admin UI (Port 5173)
│   └── lts/
│       ├── superadmin/              # LTS Superadmin Panel (Port 5174)
│       ├── vendor/                  # LTS Vendor Portal (Port 5176)
│       └── telecaller/              # LTS Telecaller CRM (Port 5177)
├── packages/
│   ├── shared-components/           # Buttons, Badges, Modals, Tables, Forms, Design Tokens
│   ├── auth/                        # Central SSO Client, Token Store, Token Refresh Hooks
│   ├── api-client/                  # Unified Axios wrapper with error boundary & interceptors
│   └── types/                       # Shared TypeScript definitions (Project, User, Role, Metrics)
├── package.json                     # Workspace root manifest
└── turbo.json (optional)            # Build caching & parallel pipeline configuration
```

#### B. Backend Monorepo (`DBMS_SuperAdmin_BE`)
```
DBMS_SuperAdmin_BE/
├── apps/
│   ├── platform-api/                # Current Platform Control Plane API (Port 3007)
│   └── lts-api/                     # Current LTS Backend Service (Port 5000)
├── packages/
│   ├── auth/                        # Platform Token Verifier, Service-to-Service HMAC Authenticator
│   ├── permissions/                 # RBAC matrix evaluator & scope validator
│   ├── api-contracts/               # Standardized Zod schemas & TypeScript API contracts
│   └── middleware/                  # Common request context, CORS, error handler, audit logger
├── package.json                     # Root workspace manifest
└── tsconfig.base.json               # Common TypeScript configuration
```

---

### 3.2 Git History Preservation Strategy

To consolidate the 4 external LTS repositories without losing commit history, blame attributions, or branch history, we execute a **Git Subtree Merge** sequence:

```bash
# Example: Integrating LTS SuperAdmin Frontend into Platform FE with Full History
cd C:\Technokrate\Platform\DBMS_SuperAdmin_FE

# 1. Add LTS SuperAdmin as a remote
git remote add lts-superadmin-remote C:\Technokrate\DBMS\LTS-DBMS-Superadmin-panel

# 2. Fetch all commits and tags
git fetch lts-superadmin-remote

# 3. Merge into target subdirectory apps/lts/superadmin
git subtree add --prefix=apps/lts/superadmin lts-superadmin-remote master --squash=false

# 4. Repeat for Vendor and Telecaller panels
git remote add lts-vendor-remote C:\Technokrate\DBMS\LTS-DBMS-vendor-panel
git fetch lts-vendor-remote
git subtree add --prefix=apps/lts/vendor lts-vendor-remote master --squash=false

git remote add lts-telecaller-remote C:\Technokrate\DBMS\LTS-DBMS-Telecaller-panel
git fetch lts-telecaller-remote
git subtree add --prefix=apps/lts/telecaller lts-telecaller-remote master --squash=false
```
*Benefits:* Preserves 100% of historical commits, authors, and commit dates, while establishing a single unified workspace.

---

## 4. Generic Project Registration Framework

To eliminate hardcoded logic, Platform BE introduces a formal **Project Registry Engine**.

### 4.1 Enhanced Project Model Schema (`Project.ts`)

```typescript
export interface IChildFrontendApp {
  appKey: string;           // e.g. "lts-superadmin", "lts-vendor", "lts-telecaller"
  name: string;             // e.g. "LTS Super Admin Portal"
  baseUrl: string;          // e.g. "https://dbms.admin.localtradestreet.com"
  allowedRoles: string[];   // e.g. ["SUPER_ADMIN", "ADMIN"]
  ssoCallbackPath: string;  // e.g. "/sso/callback"
  isDefault: boolean;
}

export interface IChildBackendConfig {
  baseUrl: string;          // e.g. "https://lts-dbms-backend.onrender.com"
  bridgePrefix: string;     // e.g. "/api/v1/platform-bridge"
  authType: "hmac" | "service_jwt" | "api_key";
  secretKeyId: string;      // Secret identifier for signing requests
  timeoutMs: number;        // Default: 5000ms
  retryAttempts: number;    // Default: 2
}

export interface IProjectRegistry {
  projectId: string;        // e.g. "PID-001"
  projectCode: string;      // e.g. "LTS" (Indexed, unique)
  name: string;             // e.g. "Local Trade Street"
  description: string;
  status: "active" | "inactive" | "on_hold" | "degraded";
  integrationStatus: "unlinked" | "registered" | "connected" | "sync_failed";
  version: {
    apiMajor: number;
    childVersion: string;
    lastSyncedAt: Date;
  };
  frontendApps: IChildFrontendApp[];
  backendConfig: IChildBackendConfig;
  availableModules: string[];
  healthStatus: {
    isHealthy: boolean;
    latencyMs: number;
    lastCheckedAt: Date;
    errorMessage?: string;
  };
}
```

---

## 5. Centralized Data Integration (Standardized Child API Bridge)

Platform Super Admin will communicate with LTS (and any child project) through a standardized child-side adapter module mounted at `/api/v1/platform-bridge/*`.

### 5.1 Standardized Bridge Endpoints

```
[Platform Super Admin BE]
          │
          ├── (1) GET  /api/v1/platform-bridge/health
          ├── (2) GET  /api/v1/platform-bridge/stats
          ├── (3) GET  /api/v1/platform-bridge/modules
          ├── (4) GET  /api/v1/platform-bridge/roles
          ├── (5) GET  /api/v1/platform-bridge/users
          ├── (6) POST /api/v1/platform-bridge/users
          ├── (7) PATCH/api/v1/platform-bridge/users/:id/status
          ├── (8) GET  /api/v1/platform-bridge/audit-logs
          └── (9) POST /api/v1/platform-bridge/sso-exchange
          │
          ▼
[LTS Backend Adapter (/src/PlatformBridge/*)]
          │
          ▼
[LTS Internal Collections: vendors, telecallers, users, roles, audits]
```

### 5.2 API Contracts (Zod Specification)

#### A. Health Check Contract
- **Endpoint:** `GET /api/v1/platform-bridge/health`
- **Response Schema:**
```typescript
{
  success: true,
  data: {
    status: "healthy" | "degraded" | "down",
    uptimeSeconds: number,
    database: {
      connected: boolean,
      latencyMs: number
    },
    version: string,
    timestamp: string
  }
}
```

#### B. Aggregated Statistics Contract
- **Endpoint:** `GET /api/v1/platform-bridge/stats`
- **Response Schema:**
```typescript
{
  success: true,
  data: {
    primaryMetrics: [
      { key: "total_vendors", label: "Registered Vendors", value: number, trend: "+12%" },
      { key: "active_telecallers", label: "Active Telecallers", value: number },
      { key: "total_customers", label: "Total Customers", value: number },
      { key: "monthly_revenue", label: "Monthly Subscriptions", value: number, currency: "INR" }
    ],
    operationalAlerts: [
      { severity: "warning" | "critical" | "info", message: string, count: number }
    ]
  }
}
```

#### C. User Synchronization Contract
- **Endpoint:** `GET /api/v1/platform-bridge/users?page=1&limit=20&search=`
- **Response Schema:**
```typescript
{
  success: true,
  data: {
    users: [
      {
        externalId: string,           // LTS _id
        email: string,
        fullName: string,
        phone: string,
        role: string,                 // "SUPER_ADMIN", "ADMIN", "TELECALLER", "VENDOR"
        status: "ACTIVE" | "INACTIVE" | "BLOCKED",
        lastLoginAt: string | null,
        createdAt: string
      }
    ],
    pagination: { total: number, page: number, pages: number }
  }
}
```

---

## 6. Authentication Architecture (Centralized SSO Federation)

### 6.1 SSO Authentication Flow

We employ an **Asymmetric Token Exchange Handshake** that bridges Platform identity into child sessions without exposing master credentials.

```
User (Browser)            Platform Super Admin FE       Platform BE               LTS Child Backend           LTS Child FE
     │                               │                       │                           │                         │
     │ 1. Click "Open LTS Admin"     │                       │                           │                         │
     ├──────────────────────────────►│                       │                           │                         │
     │                               │ 2. POST /sso/launch   │                           │                         │
     │                               ├──────────────────────►│                           │                         │
     │                               │                       │ 3. Sign Launch Ticket     │                         │
     │                               │                       │    (JWT, 60s TTL, Nonce)  │                         │
     │                               │ 4. Return Ticket + URL│                           │                         │
     │                               │◄──────────────────────┤                           │                         │
     │ 5. Redirect to Child with ticket                      │                           │                         │
     ├───────────────────────────────────────────────────────────────────────────────────┼────────────────────────►│
     │    (https://dbms.admin.localtradestreet.com/sso/callback?ticket=eyJhbGci...)     │                         │
     │                                                                                   │ 6. POST /sso-exchange   │
     │                                                                                   │    { ticket }           │
     │                                                                                   │◄────────────────────────┤
     │                                                                                   │                         │
     │                                                       │ 7. Validate Ticket Signature                        │
     │                                                       │    (Verify audience, issuer, expiry, nonce)         │
     │                                                       │ 8. Map user to Child SuperAdmin record              │
     │                                                       │ 9. Issue LTS Access Token + Refresh Token           │
     │                                                                                   ├────────────────────────►│
     │                                                                                   │ 10. Store LTS Tokens    │
     │ 11. Render Child Dashboard with verified session                                  │                         │
     │◄──────────────────────────────────────────────────────────────────────────────────┴─────────────────────────┘
```

### 6.2 Security Specifications
1. **Ticket Lifespan:** Strict 60-second expiration (`exp: epoch + 60`).
2. **Single Use Guarantee:** The Child Backend caches the `nonce` in an in-memory TTL set or Redis. Replay attacks are blocked.
3. **Audience Restriction:** Ticket contains `aud: "lts-superadmin"`. A ticket generated for LTS Superadmin cannot be redeemed on LTS Vendor or Telecaller.
4. **Preserved Standalone Logins:** LTS native login endpoints (`/api/v1/auth/login`, `/api/auth/login`, `/api/telecaller/auth/login`) remain active. Local vendor passwords and telecaller credentials continue to work independently.

---

## 7. Comprehensive Phased Migration Strategy

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PHASE 1   │────►│   PHASE 2   │────►│   PHASE 3   │────►│   PHASE 4   │────►│   PHASE 5   │
│   Registry  │     │  BE Bridge  │     │ API Standard│     │  Central SSO│     │ FE Callback │
│ Enhancement │     │   Adapter   │     │  Contracts  │     │  Handshake  │     │ Integration │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                                                                               │
       ▼                                                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  PHASE 10   │◄────│   PHASE 9   │◄────│   PHASE 8   │◄────│   PHASE 7   │◄────│   PHASE 6   │
│ CI/CD Deploy│     │  Repository │     │  Dashboard  │     │  Roles &    │     │ User Mgmt   │
│ & Cutover   │     │Consolidation│     │ Aggregation │     │ Permissions │     │ Integration │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

| Phase | Milestone | Actions | Dependencies | Risk Level |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Project Registry Enhancement** | Extend `Project.ts` schema with `backendConfig`, `frontendApps`, `authConfig`, and `health`. Add UI in `ProjectManagementPage`. | None | Low |
| **2** | **Child Bridge Adapter** | Create `/src/PlatformBridge` in `LTS-DBMS-backend-` with secure HMAC / API-Key verification middleware. | Phase 1 | Low |
| **3** | **API Standardization** | Implement `/api/v1/platform-bridge/health`, `/stats`, `/users`, `/roles`, and `/modules` on LTS backend. | Phase 2 | Medium |
| **4** | **Central SSO Handshake** | Implement ticket generation in Platform BE (`/api/platform/projects/:id/sso-ticket`) and ticket verification in LTS BE (`/sso-exchange`). | Phase 1, 3 | Medium |
| **5** | **Frontend SSO Integration** | Add `/sso/callback` route in `LTS-DBMS-Superadmin-panel` to consume tickets, set localStorage, and redirect to Dashboard. | Phase 4 | Low |
| **6** | **User Management Sync** | Connect Platform `UsersPage` with LTS Child User APIs to list, create, and toggle active status for child users. | Phase 3, 5 | Medium |
| **7** | **Role & Module Mapping** | Map LTS Permission Matrix (Customer, Vendor, Queries, Reports, Audit, User) into Platform Role definitions. | Phase 3, 6 | Medium |
| **8** | **Dashboard & Reports Sync** | Populate Platform `ReportsPage` and `DashboardPage` with live aggregated telemetry fetched from LTS bridge. | Phase 3 | Low |
| **9** | **Repository Consolidation** | Execute Git Subtree migration to move LTS frontend panels into `DBMS_SuperAdmin_FE/apps/lts/*` and LTS backend into `DBMS_SuperAdmin_BE/apps/lts-api`. | Phases 1–8 validated | High |
| **10** | **CI/CD & Production Cutover** | Update Netlify/Render deployment commands to build from workspace packages; configure environment variables. | Phase 9 | High |

---

## 8. Risks and Compatibility Analysis

### 8.1 Technical Risk Matrix

| Risk Factor | Root Cause | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **CORS Origin Rejection** | Frontends run across multiple Netlify domains & local ports | SSO callbacks and API bridge calls blocked by browser | Configure origin pattern matching in both Platform and LTS backends (`/^https?:\/\/([a-z0-9-]+\.)?localtradestreet\.com$/` and netlify.app). |
| **Cookie Partitioning** | LTS uses `res.cookie('refreshToken')` | Third-party cookies blocked when launched from cross-domain control plane | Migrate Child frontends to Authorization Bearer headers in `localStorage` / `sessionStorage` for cross-origin SSO launch. |
| **Dependency Conflicts** | LTS SuperAdmin uses Tailwind v4 & React 19; Platform FE uses custom CSS tokens & React 19 | Monorepo build conflicts | Use separate Vite config per app workspace. Do not mix global styles across packages. |
| **ESM vs CommonJS** | LTS BE uses ESM (`"type": "module"`); Platform BE uses CommonJS | Inter-package module resolution errors | Maintain separate package entry points (`dist/index.cjs` vs `dist/index.js`) via TypeScript build targets. |
| **Network Latency / Child Outage** | Render free/standard tier spin-down delay (cold starts ~45s) | Platform Dashboard freezes waiting for child stats | Implement strict 3000ms timeouts with circuit breakers and cached fallbacks in Platform BE. |

---

## 9. Recommended Implementation Sequence

```
[Sprint 1: Registry & Health Bridge]
  ├── Task 1: Update Platform Project Model Schema & Project Details UI
  ├── Task 2: Build LTS Backend Bridge Security Middleware & Health Endpoint
  └── Task 3: Verify Automated Health Polling from Platform to LTS

[Sprint 2: Federated Single Sign-On]
  ├── Task 4: Implement Platform SSO Ticket Signing Endpoint
  ├── Task 5: Implement LTS Ticket Verification & Session Creation
  └── Task 6: Add SSO Callback Handler to LTS SuperAdmin Frontend

[Sprint 3: Telemetry & User Federation]
  ├── Task 7: Implement Child Metrics & Dashboard Stats Bridge
  ├── Task 8: Implement Child User Listing & Status Toggle Bridge
  └── Task 9: Connect Platform SuperAdmin UI to Child Endpoints

[Sprint 4: Workspace Consolidation]
  ├── Task 10: Git Subtree Merge of LTS Frontends into Platform FE Monorepo
  ├── Task 11: Git Subtree Merge of LTS Backend into Platform BE Monorepo
  └── Task 12: CI/CD Pipeline Verification & Production Deployment
```

---

## 10. Complete Inventory of Files Requiring Modification

### 10.1 Platform Backend (`DBMS_SuperAdmin_BE`)
- [`src/models/Project.ts`](file:///C:/Technokrate/Platform/DBMS_SuperAdmin_BE/src/models/Project.ts): Extend schema with `backendConfig`, `frontendApps`, `authConfig`, and `healthStatus`.
- [`src/validators/rbac.ts`](file:///C:/Technokrate/Platform/DBMS_SuperAdmin_BE/src/validators/rbac.ts): Add validation rules for child backend configuration and frontend app links.
- [`src/services/projectService.ts`](file:///C:/Technokrate/Platform/DBMS_SuperAdmin_BE/src/services/projectService.ts): Implement child registration, health ping, and project configuration logic.
- **NEW:** `src/services/childBridge.service.ts`: HTTP client wrapper for dispatching signed requests to child backends.
- **NEW:** `src/services/sso.service.ts`: SSO Ticket generation, signing, and nonce management.
- [`src/routes/platformRoutes.ts`](file:///C:/Technokrate/Platform/DBMS_SuperAdmin_BE/src/routes/platformRoutes.ts): Register `/projects/:id/sso-ticket`, `/projects/:id/sync`, `/projects/:id/health`.

### 10.2 Platform Frontend (`DBMS_SuperAdmin_FE`)
- [`apps/platform-admin/src/features/projects/ProjectManagementPage.tsx`](file:///C:/Technokrate/Platform/DBMS_SuperAdmin_FE/apps/platform-admin/src/features/projects/ProjectManagementPage.tsx): Add project configuration modal for child frontend URLs, backend endpoints, and SSO launch buttons.
- [`apps/platform-admin/src/features/dashboard/DashboardPage.tsx`](file:///C:/Technokrate/Platform/DBMS_SuperAdmin_FE/apps/platform-admin/src/features/dashboard/DashboardPage.tsx): Display child health indicators and aggregated multi-project statistics.
- [`apps/platform-admin/src/features/users/UsersPage.tsx`](file:///C:/Technokrate/Platform/DBMS_SuperAdmin_FE/apps/platform-admin/src/features/users/UsersPage.tsx): Filter users by tenant project and proxy child user modifications.

### 10.3 LTS Child Backend (`LTS-DBMS-backend-`)
- **NEW:** `src/PlatformBridge/bridgeMiddleware.js`: Verify incoming Platform API keys / HMAC signatures.
- **NEW:** `src/PlatformBridge/bridgeController.js`: Handlers for health, stats, user proxy, role matrix, and SSO exchange.
- **NEW:** `src/PlatformBridge/bridgeRoutes.js`: Expose `/api/v1/platform-bridge/*` routes.
- [`server.js`](file:///C:/Technokrate/DBMS/LTS-DBMS-backend-/server.js): Mount platform bridge router and update CORS origin whitelist.

### 10.4 LTS SuperAdmin Frontend (`LTS-DBMS-Superadmin-panel`)
- **NEW:** `src/Pages/SsoCallback.jsx`: Extract `?ticket=...` query param, call bridge exchange endpoint, store tokens, and redirect to Dashboard.
- [`src/App.jsx`](file:///C:/Technokrate/DBMS/LTS-DBMS-Superadmin-panel/src/App.jsx): Register `<Route path="/sso/callback" element={<SsoCallback />} />`.

### 10.5 LTS Vendor & Telecaller Panels
- Minor updates to `api.js` to ensure support for cross-domain launch tokens when activated from Platform.

---

## Approval Request & Next Steps

This analysis strictly follows all constraints:
- **No code modified.**
- **No repositories moved.**
- **No database schemas altered.**
- **Zero dependencies installed.**

Upon your review and explicit approval, we can begin **Phase 1: Project Registration Schema & UI Enhancements**.
