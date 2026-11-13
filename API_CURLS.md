# DBMS Super Admin API - Frontend Integration & cURL Guide

This document contains all API endpoints, request/response formats, headers, query parameters, error codes, and ready-to-run **cURL** commands for frontend developers.

---

## 🌐 Environment & Base URL

| Environment | Base URL |
| :--- | :--- |
| **Local Development** | `http://localhost:3007` |
| **Default Port** | `3007` (configurable via `PORT` in `.env`) |
| **CORS Allowed Origins** | `http://localhost:5173` (Vite default) or `FRONTEND_URL` in `.env` |

---

## 📋 Common Headers & Standards

### Standard Request Headers
```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <ACCESS_TOKEN>
X-Request-ID: <optional-unique-uuid-or-id>
```

> **Note on `X-Request-ID`**: Frontend can supply a custom tracking ID (alphanumeric, dots, underscores, dashes, max 128 chars). If omitted, the server automatically generates a UUID and returns it in the response body (`requestId`) and response header `X-Request-ID`.

---

## 📦 Standard Response Envelope

Every endpoint in this service returns a consistent JSON envelope structure:

### Success Response Format (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "message": "Operation description message",
  "data": { ... },
  "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```

### Error Response Format (`400`, `401`, `403`, `404`, `409`, `500`)
```json
{
  "success": false,
  "message": "Detailed error message",
  "error": {
    "code": "ERROR_CODE_STRING"
  },
  "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```

### Common Error Codes
| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| `400` | `VALIDATION_ERROR` | Schema validation failed (missing or invalid body/query/param fields) |
| `400` | `CANNOT_DEACTIVATE_SELF` | User tried to deactivate their own account |
| `400` | `CANNOT_DELETE_SELF` | User tried to delete their own account |
| `400` | `CANNOT_DEMOTE_LAST_SUPERADMIN` | Attempted to change the role of the only remaining superadmin |
| `400` | `CANNOT_DEACTIVATE_LAST_SUPERADMIN`| Attempted to deactivate the only active superadmin |
| `400` | `CANNOT_DELETE_LAST_SUPERADMIN` | Attempted to delete the only superadmin |
| `401` | `AUTHENTICATION_REQUIRED` | Missing or malformed `Authorization: Bearer <token>` header |
| `401` | `INVALID_ACCESS_TOKEN` | Token is invalid, tampered, or expired |
| `401` | `INVALID_CREDENTIALS` | Invalid email or password during login |
| `403` | `FORBIDDEN` | Insufficient role permissions for this endpoint |
| `404` | `USER_NOT_FOUND` | User ID does not exist in the database |
| `404` | `NOT_FOUND` | Route does not exist |
| `409` | `USER_ALREADY_EXISTS` | A user with this email address already exists |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected internal server error |

---

## 🔐 Role-Based Access Control (RBAC)

The system supports 4 roles:
- `superadmin`: Full unrestricted access (User management, create superadmins, delete users, change superadmin credentials).
- `admin`: User management for non-superadmin accounts (cannot create/modify/delete superadmins).
- `manager`: Non-admin role (cannot manage users via Super Admin backend).
- `user`: Non-admin standard role.

---

# 🚀 API Endpoints & cURLs

---

### 1. Health Check

Verifies backend server health and uptime.

- **Method**: `GET`
- **Path**: `/api/health`
- **Auth**: None (Public)

#### cURL
```bash
curl -X GET "http://localhost:3007/api/health" \
  -H "Accept: application/json"
```

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "DBMS Super Admin API is running",
  "data": {
    "service": "dbms-superadmin-api",
    "timestamp": "2026-10-26T10:30:00.000Z"
  },
  "requestId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
}
```

---

### 2. User Authentication (Login)

Authenticate user and receive a signed JWT access token.

- **Method**: `POST`
- **Path**: `/api/auth/login`
- **Auth**: None (Public)
- **Content-Type**: `application/json`

#### Request Body
| Field | Type | Required | Constraints |
| :--- | :--- | :--- | :--- |
| `email` | `string` | **Yes** | Valid email, max 254 chars (automatically lowercased) |
| `password` | `string` | **Yes** | 1 to 128 characters |

#### cURL
```bash
curl -X POST "http://localhost:3007/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "superadmin@example.com",
    "password": "SuperAdminPassword123!"
  }'
```

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": "15m",
    "user": {
      "id": "671cc81a1a2b3c4d5e6f7a8b",
      "name": "Super Admin",
      "email": "superadmin@example.com",
      "role": "superadmin",
      "projectIds": []
    }
  },
  "requestId": "123e4567-e89b-12d3-a456-426614174000"
}
```

---

### 3. Protected Route Verification (Test)

Verifies if an access token is valid and returns decoded token session info.

- **Method**: `GET`
- **Path**: `/api/test/protected`
- **Auth**: Bearer Token required

#### cURL
```bash
curl -X GET "http://localhost:3007/api/test/protected" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Accept: application/json"
```

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "Protected route accessed successfully",
  "data": {
    "authenticated": true,
    "auth": {
      "userId": "671cc81a1a2b3c4d5e6f7a8b",
      "role": "superadmin",
      "projectIds": []
    }
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 4. List Users (Search, Filter, Sort, Paginate)

List system users. Supports pagination, full-text search across name & email, role filter, active status, project filter, and sorting.

- **Method**: `GET`
- **Path**: `/api/users`
- **Auth**: Bearer Token required (`superadmin` or `admin`)
- **Query Parameters**:

| Parameter | Type | Default | Options / Details |
| :--- | :--- | :--- | :--- |
| `page` | `number` | `1` | Page number (min: 1) |
| `limit` | `number` | `10` | Users per page (1 to 100) |
| `search` | `string` | _optional_ | Case-insensitive search on `name` or `email` |
| `role` | `string` | _optional_ | `superadmin`, `admin`, `manager`, `user` |
| `isActive` | `string` | _optional_ | `"true"` or `"false"` |
| `projectId`| `string` | _optional_ | Filter by assigned Project ID |
| `sortBy` | `string` | `createdAt` | `createdAt`, `name`, `email`, `lastLoginAt` |
| `sortOrder`| `string` | `desc` | `asc` or `desc` |

#### cURL (Basic)
```bash
curl -X GET "http://localhost:3007/api/users?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Accept: application/json"
```

#### cURL (Filtered & Searched)
```bash
curl -X GET "http://localhost:3007/api/users?search=john&role=admin&isActive=true&sortBy=name&sortOrder=asc&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Accept: application/json"
```

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "671cc81a1a2b3c4d5e6f7a8b",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "admin",
        "projectIds": [
          "proj-alpha-1"
        ],
        "isActive": true,
        "lastLoginAt": "2026-10-26T09:15:30.123Z",
        "createdAt": "2026-10-20T08:00:00.000Z",
        "updatedAt": "2026-10-26T09:15:30.123Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  },
  "requestId": "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e"
}
```

---

### 5. Create New User

Create a new user account. Only Super Admins can create another Super Admin.

- **Method**: `POST`
- **Path**: `/api/users`
- **Auth**: Bearer Token required (`superadmin` or `admin`)
- **Content-Type**: `application/json`

#### Request Body
| Field | Type | Required | Default | Validation |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | - | 2 - 100 characters |
| `email` | `string` | **Yes** | - | Valid email, max 254 characters |
| `password` | `string` | **Yes** | - | 8 - 128 characters |
| `role` | `string` | No | `"user"` | `"superadmin"`, `"admin"`, `"manager"`, `"user"` |
| `projectIds` | `string[]` | No | `[]` | Array of project identifier strings |
| `isActive` | `boolean` | No | `true` | `true` or `false` |

#### cURL
```bash
curl -X POST "http://localhost:3007/api/users" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "password": "SecurePassword123!",
    "role": "manager",
    "projectIds": ["proj-101", "proj-102"],
    "isActive": true
  }'
```

#### Sample Response (`201 Created`)
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "671cd93e2b3c4d5e6f7a8c90",
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "role": "manager",
    "projectIds": [
      "proj-101",
      "proj-102"
    ],
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-10-26T10:35:10.500Z",
    "updatedAt": "2026-10-26T10:35:10.500Z"
  },
  "requestId": "3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f"
}
```

---

### 6. Get User by ID

Fetch details of a single user by MongoDB ObjectId.

- **Method**: `GET`
- **Path**: `/api/users/:id`
- **Auth**: Bearer Token required (`superadmin` or `admin`)
- **URL Parameters**:
  - `id`: 24-character hexadecimal string

#### cURL
```bash
curl -X GET "http://localhost:3007/api/users/671cd93e2b3c4d5e6f7a8c90" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Accept: application/json"
```

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "671cd93e2b3c4d5e6f7a8c90",
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "role": "manager",
    "projectIds": [
      "proj-101",
      "proj-102"
    ],
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-10-26T10:35:10.500Z",
    "updatedAt": "2026-10-26T10:35:10.500Z"
  },
  "requestId": "4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f90"
}
```

---

### 7. Update User Details

Update editable attributes of an existing user account.
- Regular admins cannot modify `superadmin` accounts or promote someone to `superadmin`.
- Demoting the last superadmin is blocked.

- **Method**: `PUT`
- **Path**: `/api/users/:id`
- **Auth**: Bearer Token required (`superadmin` or `admin`)
- **Content-Type**: `application/json`

#### Request Body (All fields optional, provide what to update)
| Field | Type | Constraints |
| :--- | :--- | :--- |
| `name` | `string` | 2 - 100 characters |
| `email` | `string` | Valid email, max 254 characters |
| `role` | `string` | `"superadmin"`, `"admin"`, `"manager"`, `"user"` |
| `projectIds` | `string[]` | Array of project identifier strings |
| `isActive` | `boolean` | `true` or `false` |

#### cURL
```bash
curl -X PUT "http://localhost:3007/api/users/671cd93e2b3c4d5e6f7a8c90" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "name": "Jane Doe Smith",
    "role": "admin",
    "projectIds": ["proj-101", "proj-102", "proj-103"]
  }'
```

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "671cd93e2b3c4d5e6f7a8c90",
    "name": "Jane Doe Smith",
    "email": "jane.smith@example.com",
    "role": "admin",
    "projectIds": [
      "proj-101",
      "proj-102",
      "proj-103"
    ],
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-10-26T10:35:10.500Z",
    "updatedAt": "2026-10-26T10:40:22.120Z"
  },
  "requestId": "5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9012"
}
```

---

### 8. Toggle User Active / Inactive Status

Quick status toggle for activating or deactivating a user.
- A user cannot deactivate their own account.
- The last active Super Admin cannot be deactivated.
- Only a Super Admin can change another Super Admin's status.

- **Method**: `PATCH`
- **Path**: `/api/users/:id/status`
- **Auth**: Bearer Token required (`superadmin` or `admin`)
- **Content-Type**: `application/json`

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `isActive` | `boolean` | **Yes** | `true` to activate, `false` to deactivate |

#### cURL
```bash
curl -X PATCH "http://localhost:3007/api/users/671cd93e2b3c4d5e6f7a8c90/status" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "isActive": false
  }'
```

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "User status updated successfully",
  "data": {
    "id": "671cd93e2b3c4d5e6f7a8c90",
    "name": "Jane Doe Smith",
    "email": "jane.smith@example.com",
    "role": "admin",
    "projectIds": [
      "proj-101",
      "proj-102",
      "proj-103"
    ],
    "isActive": false,
    "lastLoginAt": null,
    "createdAt": "2026-10-26T10:35:10.500Z",
    "updatedAt": "2026-10-26T10:45:00.000Z"
  },
  "requestId": "6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f901234"
}
```

---

### 9. Reset User Password

Admin password reset for a target user.
- Super Admin passwords can only be reset by a Super Admin.

- **Method**: `POST`
- **Path**: `/api/users/:id/reset-password`
- **Auth**: Bearer Token required (`superadmin` or `admin`)
- **Content-Type**: `application/json`

#### Request Body
| Field | Type | Required | Constraints |
| :--- | :--- | :--- | :--- |
| `password` | `string` | **Yes** | 8 - 128 characters |

#### cURL
```bash
curl -X POST "http://localhost:3007/api/users/671cd93e2b3c4d5e6f7a8c90/reset-password" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "password": "NewSecretPassword123!"
  }'
```

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "User password reset successfully",
  "data": {
    "id": "671cd93e2b3c4d5e6f7a8c90",
    "name": "Jane Doe Smith",
    "email": "jane.smith@example.com",
    "role": "admin",
    "projectIds": [
      "proj-101",
      "proj-102",
      "proj-103"
    ],
    "isActive": false,
    "lastLoginAt": null,
    "createdAt": "2026-10-26T10:35:10.500Z",
    "updatedAt": "2026-10-26T10:48:15.000Z"
  },
  "requestId": "7a8b9c0d-1e2f-3a4b-5c6d-7e8f90123456"
}
```

---

### 10. Delete User (Super Admin Only)

Permanently delete a user account from the system.
- Restricted strictly to **Super Admin** role (`403 FORBIDDEN` for other roles).
- A Super Admin cannot delete their own account (`CANNOT_DELETE_SELF`).
- The last remaining Super Admin cannot be deleted (`CANNOT_DELETE_LAST_SUPERADMIN`).

- **Method**: `DELETE`
- **Path**: `/api/users/:id`
- **Auth**: Bearer Token required (`superadmin` role only)

#### cURL
```bash
curl -X DELETE "http://localhost:3007/api/users/671cd93e2b3c4d5e6f7a8c90" \
  -H "Authorization: Bearer YOUR_SUPERADMIN_ACCESS_TOKEN" \
  -H "Accept: application/json"
```

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "id": "671cd93e2b3c4d5e6f7a8c90",
    "deleted": true
  },
  "requestId": "8b9c0d1e-2f3a-4b5c-6d7e-8f9012345678"
}
```

---

## 🛠️ Frontend Quick Start (JavaScript / TypeScript Fetch Helper)

Here is a ready-to-copy client-side API helper using native `fetch`:

```typescript
const BASE_URL = "http://localhost:3007";

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: { code: string };
  requestId?: string;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await response.json();

  if (!response.ok || !json.success) {
    const error = new Error(json.message || "API request failed");
    (error as any).code = json.error?.code;
    (error as any).status = response.status;
    (error as any).requestId = json.requestId;
    throw error;
  }

  return json;
}
```

### Usage Example:
```typescript
// 1. Login
const loginRes = await apiRequest("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email: "superadmin@example.com",
    password: "SuperAdminPassword123!",
  }),
});

const token = loginRes.data.accessToken;

// 2. Fetch Users List
const usersRes = await apiRequest("/api/users?page=1&limit=10", {
  method: "GET",
}, token);

console.log("Users:", usersRes.data.users);
```
