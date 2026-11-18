# 🧪 DBMS Super Admin - Fake Test Data & Payloads Guide

This guide provides test payloads, login credentials, and request examples to test every endpoint in the backend.

---

## ⚡ Fast Seeding (Optional)

If you have MongoDB running and want dummy data populated instantly into your database for testing (search, pagination, filters, status toggle):

```bash
npm run seed
```

This will automatically create 8 test users across `admin`, `manager`, and `user` roles with pre-hashed passwords.

---

## 🔑 Test Credentials (Pre-configured)

| Role | Email | Password | Status | Assigned Projects |
| :--- | :--- | :--- | :---: | :--- |
| **Super Admin** | Configured in your `.env` | Configured in your `.env` | Active | None (Global Access) |
| **Admin** | `sarah.admin@enterprise.io` | `AdminSecure2026!#` | Active | `PRJ-DATABASE-MIGRATION`, `PRJ-SECURITY-COMPLIANCE` |
| **Admin** | `chloe.admin@lapd-ops.gov` | `ChloeAdminPass2026!` | Active | `PRJ-SECURITY-COMPLIANCE` |
| **Manager** | `david.manager@cloudcorp.com`| `ManagerPass987$!` | Active | `PRJ-DATABASE-MIGRATION`, `PRJ-BILLING-V2` |
| **Manager** | `elena.rostova@analytics.ai` | `ElenaPassword@2026` | Active | `PRJ-ANALYTICS-PIPELINE`, `PRJ-DATA-LAKE` |
| **User** | `emily.dev@technocrate.io` | `DevUserSecret#2026` | Active | `PRJ-DATABASE-MIGRATION` |
| **User** | `marcus.dev@technocrate.io` | `MarcusPassword!2026` | Active | `PRJ-DATABASE-MIGRATION`, `PRJ-BACKEND-CORE` |
| **User (Inactive)**| `robert.vance@auditors.org` | `AuditorPassword!2026`| **Inactive** | `PRJ-FINANCIAL-AUDIT` |

---

## 📬 Raw Test Payloads per Endpoint

### 1. `POST /api/auth/login`

#### ✅ Valid Super Admin Login
```json
{
  "email": "superadmin@example.com",
  "password": "SuperAdminPassword123!"
}
```

#### ✅ Valid Secondary Admin Login
```json
{
  "email": "sarah.admin@enterprise.io",
  "password": "AdminSecure2026!#"
}
```

#### ❌ Invalid Credentials Test (Expect `401 INVALID_CREDENTIALS`)
```json
{
  "email": "sarah.admin@enterprise.io",
  "password": "WrongPassword999"
}
```

#### ❌ Schema Validation Test (Expect `400 VALIDATION_ERROR`)
```json
{
  "email": "invalid-email-format",
  "password": ""
}
```

---

### 2. `GET /api/test/protected`
- **Header**: `Authorization: Bearer <token>`
- **No body required**.

---

### 3. `GET /api/users` (Query Test Combinations)

#### 🔹 Default pagination (Page 1, 10 items):
```http
GET /api/users?page=1&limit=10
```

#### 🔹 Filter by role (`manager`):
```http
GET /api/users?role=manager&page=1&limit=10
```

#### 🔹 Filter by active accounts only:
```http
GET /api/users?isActive=true&page=1&limit=10
```

#### 🔹 Filter by inactive accounts only:
```http
GET /api/users?isActive=false&page=1&limit=10
```

#### 🔹 Search across name and email (e.g., query `connor`):
```http
GET /api/users?search=connor&page=1&limit=10
```

#### 🔹 Filter by Project ID:
```http
GET /api/users?projectId=PRJ-DATABASE-MIGRATION&page=1&limit=10
```

#### 🔹 Sort alphabetically by Name:
```http
GET /api/users?sortBy=name&sortOrder=asc&page=1&limit=20
```

---

### 4. `POST /api/users` (Create User)

#### ✅ Sample 1: Create an Admin
```json
{
  "name": "Bruce Wayne",
  "email": "bruce.wayne@wayne-enterprises.com",
  "password": "BatcaveSecurity#2026",
  "role": "admin",
  "projectIds": ["PRJ-SURVEILLANCE", "PRJ-CLOUD-INFRA"],
  "isActive": true
}
```

#### ✅ Sample 2: Create a Manager
```json
{
  "name": "Lucius Fox",
  "email": "lucius.fox@wayne-enterprises.com",
  "password": "FoxManagerPass!2026",
  "role": "manager",
  "projectIds": ["PRJ-R-AND-D", "PRJ-CLOUD-INFRA"],
  "isActive": true
}
```

#### ✅ Sample 3: Create a Standard Developer User
```json
{
  "name": "Peter Parker",
  "email": "peter.parker@dailybugle.com",
  "password": "SpideyPassword#123",
  "role": "user",
  "projectIds": ["PRJ-FRONTEND-APP"],
  "isActive": true
}
```

#### ❌ Validation Test: Password too short (Expect `400 VALIDATION_ERROR`)
```json
{
  "name": "Short Password Test",
  "email": "short.pass@example.com",
  "password": "123",
  "role": "user",
  "projectIds": []
}
```

---

### 5. `GET /api/users/:id`
- Replace `:id` with any 24-character hexadecimal ObjectId (e.g., from `GET /api/users`).
```http
GET /api/users/671cd93e2b3c4d5e6f7a8c90
```

---

### 6. `PUT /api/users/:id` (Update User)

#### ✅ Update Name and Projects:
```json
{
  "name": "Bruce T. Wayne",
  "projectIds": ["PRJ-SURVEILLANCE", "PRJ-CLOUD-INFRA", "PRJ-SATELLITE-GRID"]
}
```

#### ✅ Update Role and Email:
```json
{
  "email": "bruce.new@wayne-enterprises.com",
  "role": "manager"
}
```

---

### 7. `PATCH /api/users/:id/status` (Toggle Active / Inactive)

#### ✅ Deactivate User:
```json
{
  "isActive": false
}
```

#### ✅ Reactivate User:
```json
{
  "isActive": true
}
```

---

### 8. `POST /api/users/:id/reset-password` (Reset Password)

#### ✅ Valid New Password:
```json
{
  "password": "FreshSecurePassword#2026!"
}
```

#### ❌ Password Under 8 Characters (Expect `400 VALIDATION_ERROR`):
```json
{
  "password": "abc"
}
```

---

### 9. `DELETE /api/users/:id` (Delete User)
- **Header**: `Authorization: Bearer <superadmin-token>`
- **No body required**.
- **Role Requirement**: Super Admin only.
