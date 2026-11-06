# 🚀 Simple Frontend API Guide

This is a clean, simple guide to help frontend developers connect to the backend APIs quickly.

---

## ⚡ 3 Things You Need to Know

### 1. Base URL
```
http://localhost:3007
```

### 2. Standard Response Format
Every API returns data inside `data`:
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```
If an error happens, it looks like this:
```json
{
  "success": false,
  "message": "Invalid email or password",
  "error": { "code": "INVALID_CREDENTIALS" }
}
```

### 3. Protected APIs (Token)
After logging in, you get an `accessToken`. Send it in the headers for all protected endpoints:
```http
Authorization: Bearer <your_access_token>
Content-Type: application/json
```

---

## 📋 API Quick Reference

| Action | Method | Endpoint | Needs Login? |
| :--- | :---: | :--- | :---: |
| **Check Backend Health** | `GET` | `/api/health` | ❌ No |
| **Login** | `POST` | `/api/auth/login` | ❌ No |
| **Verify Login Session** | `GET` | `/api/test/protected` | ✅ Yes |
| **Get All Users (List)** | `GET` | `/api/users` | ✅ Yes |
| **Create New User** | `POST` | `/api/users` | ✅ Yes |
| **Get Single User Details** | `GET` | `/api/users/:id` | ✅ Yes |
| **Update User Details** | `PUT` | `/api/users/:id` | ✅ Yes |
| **Active / Deactivate User** | `PATCH` | `/api/users/:id/status` | ✅ Yes |
| **Reset User Password** | `POST` | `/api/users/:id/reset-password` | ✅ Yes |
| **Delete User** | `DELETE` | `/api/users/:id` | ✅ Yes *(Super Admin only)* |

---

## 🔑 1. Authentication (Login First)

### `POST /api/auth/login`
Use this to log in and get your `accessToken`.

- **Headers**: `Content-Type: application/json`
- **Needs Token?**: ❌ No

#### 📤 What to Send (Body):
```json
{
  "email": "shivanshcoc11@gmail.com",
  "password": "Bhoolgy@12"
}
```

#### 📥 What You Get Back:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": "7d",
    "user": {
      "id": "6ae029ac420965b03cd6deac",
      "name": "Shivansh",
      "email": "shivanshcoc11@gmail.com",
      "role": "superadmin",
      "projectIds": []
    }
  }
}
```
> 💡 **Tip:** Save `data.accessToken` in `localStorage` or `sessionStorage` so you can use it in all other API calls.

---

## 👥 2. User Management APIs

All APIs in this section require this header:
```http
Authorization: Bearer <accessToken>
```

---

### A. Get All Users (with Search & Pagination)
### `GET /api/users`

Fetches users list for your table or grid.

#### 📤 What to Send:
Send options as URL query parameters (all are optional):
- `page`: Page number (default: `1`)
- `limit`: Number of users per page (default: `10`)
- `search`: Search query by name or email (e.g. `?search=john`)
- `role`: Filter by role: `admin`, `manager`, `user`, or `superadmin`
- `isActive`: Filter by status: `true` or `false`
- `sortBy`: `name`, `email`, `createdAt`, or `lastLoginAt`
- `sortOrder`: `asc` or `desc`

**Example Request URL:**
```
GET http://localhost:3007/api/users?page=1&limit=10&search=john
```

#### 📥 What You Get Back:
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "6ae029ac420965b03cd6deac",
        "name": "Shivansh",
        "email": "shivanshcoc11@gmail.com",
        "role": "superadmin",
        "projectIds": [],
        "isActive": true,
        "lastLoginAt": "2026-10-27T10:00:00.000Z",
        "createdAt": "2026-10-27T09:30:00.000Z",
        "updatedAt": "2026-10-27T10:00:00.000Z"
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
  }
}
```

---

### B. Create a New User
### `POST /api/users`

Creates a new user account.

#### 📤 What to Send (Body):
```json
{
  "name": "Rahul Sharma",
  "email": "rahul.sharma@example.com",
  "password": "Password123!",
  "role": "admin",
  "projectIds": ["PROJECT-1", "PROJECT-2"],
  "isActive": true
}
```

| Field | Type | Required? | Rules |
| :--- | :--- | :---: | :--- |
| `name` | string | ✅ Yes | Min 2 characters |
| `email` | string | ✅ Yes | Valid email |
| `password` | string | ✅ Yes | Min 8 characters |
| `role` | string | ❌ No | `"superadmin"`, `"admin"`, `"manager"`, `"user"` (default: `"user"`) |
| `projectIds` | array | ❌ No | List of project strings (default: `[]`) |
| `isActive` | boolean | ❌ No | `true` or `false` (default: `true`) |

#### 📥 What You Get Back (`201 Created`):
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "671e6267814b1a456c7d8e90",
    "name": "Rahul Sharma",
    "email": "rahul.sharma@example.com",
    "role": "admin",
    "projectIds": ["PROJECT-1", "PROJECT-2"],
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-10-27T10:30:00.000Z",
    "updatedAt": "2026-10-27T10:30:00.000Z"
  }
}
```

---

### C. Get a Single User by ID
### `GET /api/users/:id`

View full profile details of a single user.

- Put the user's `id` directly in the URL:
```
GET http://localhost:3007/api/users/671e6267814b1a456c7d8e90
```

#### 📥 What You Get Back:
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "671e6267814b1a456c7d8e90",
    "name": "Rahul Sharma",
    "email": "rahul.sharma@example.com",
    "role": "admin",
    "projectIds": ["PROJECT-1", "PROJECT-2"],
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-10-27T10:30:00.000Z",
    "updatedAt": "2026-10-27T10:30:00.000Z"
  }
}
```

---

### D. Update User Details
### `PUT /api/users/:id`

Edit an existing user's information. Send **only** the fields you want to change.

- **URL**: `PUT http://localhost:3007/api/users/671e6267814b1a456c7d8e90`

#### 📤 What to Send (Body):
```json
{
  "name": "Rahul K. Sharma",
  "role": "manager",
  "projectIds": ["PROJECT-1", "PROJECT-3"]
}
```

#### 📥 What You Get Back:
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "671e6267814b1a456c7d8e90",
    "name": "Rahul K. Sharma",
    "email": "rahul.sharma@example.com",
    "role": "manager",
    "projectIds": ["PROJECT-1", "PROJECT-3"],
    "isActive": true,
    "lastLoginAt": null,
    "createdAt": "2026-10-27T10:30:00.000Z",
    "updatedAt": "2026-10-27T10:35:00.000Z"
  }
}
```

---

### E. Turn User On / Off (Active / Inactive Status)
### `PATCH /api/users/:id/status`

Use this for a toggle switch in your UI to activate or deactivate a user account.

- **URL**: `PATCH http://localhost:3007/api/users/671e6267814b1a456c7d8e90/status`

#### 📤 What to Send (Body):
To deactivate:
```json
{
  "isActive": false
}
```
To activate:
```json
{
  "isActive": true
}
```

#### 📥 What You Get Back:
```json
{
  "success": true,
  "message": "User status updated successfully",
  "data": {
    "id": "671e6267814b1a456c7d8e90",
    "name": "Rahul K. Sharma",
    "isActive": false
  }
}
```
*(Note: You cannot deactivate your own account!)*

---

### F. Reset User Password
### `POST /api/users/:id/reset-password`

Allows an admin to set a new password for a user.

- **URL**: `POST http://localhost:3007/api/users/671e6267814b1a456c7d8e90/reset-password`

#### 📤 What to Send (Body):
```json
{
  "password": "NewSecretPassword123!"
}
```
*(Password must be at least 8 characters).*

#### 📥 What You Get Back:
```json
{
  "success": true,
  "message": "User password reset successfully",
  "data": {
    "id": "671e6267814b1a456c7d8e90",
    "name": "Rahul K. Sharma"
  }
}
```

---

### G. Delete a User
### `DELETE /api/users/:id`

Permanently deletes a user from the system. Only a **Super Admin** can call this.

- **URL**: `DELETE http://localhost:3007/api/users/671e6267814b1a456c7d8e90`
- **Body**: None

#### 📥 What You Get Back:
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "id": "671e6267814b1a456c7d8e90",
    "deleted": true
  }
}
```

---

## 🧪 3. Test Logins (Copy & Paste)

You can use these accounts to test login immediately in your UI or Postman:

| Role | Email | Password | What Can They Do? |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `shivanshcoc11@gmail.com` | `Bhoolgy@12` | Full access (can delete, create other admins, change anything) |
| **Admin** | `sarah.admin@enterprise.io` | `AdminSecure2026!#` | Can manage users (cannot delete or edit superadmins) |
| **Manager** | `david.manager@cloudcorp.com` | `ManagerPass987$!` | Standard manager account |

*(If Sarah or David aren't in your DB yet, run `npm run seed` in your backend terminal to generate them).*

---

## 🛠️ 4. Ready-to-Copy Frontend Fetch Example

Here is a simple JavaScript / TypeScript function you can paste directly into your React / Vue / Vanilla project:

```javascript
const BASE_URL = "http://localhost:3007";

// Universal API fetcher
async function apiCall(endpoint, method = "GET", data = null) {
  const token = localStorage.getItem("accessToken");

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    }
  };

  if (data && method !== "GET") {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const result = await response.json();

  if (!result.success) {
    alert(result.message); // or show error in UI
    throw new Error(result.message);
  }

  return result.data;
}

// 1. Example: How to Login
async function handleLogin() {
  const data = await apiCall("/api/auth/login", "POST", {
    email: "shivanshcoc11@gmail.com",
    password: "Bhoolgy@12"
  });

  // Save token for next requests
  localStorage.setItem("accessToken", data.accessToken);
  console.log("Logged in user:", data.user);
}

// 2. Example: How to Get Users List
async function loadUsers() {
  const data = await apiCall("/api/users?page=1&limit=10");
  console.log("Users list:", data.users);
}
```
