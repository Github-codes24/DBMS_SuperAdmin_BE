# DBMS Super Admin Backend

Backend API for the DBMS Super Admin platform, built with Node.js, Express, TypeScript, and MongoDB.

The platform will provide centralized management of projects, users, roles, permissions, and project-level access.

## 1. Technology Stack

- Node.js
- Express 5
- TypeScript
- MongoDB
- Mongoose
- JWT (JSON Web Token) authentication
- bcryptjs for password hashing
- Zod for request validation
- Helmet for HTTP security headers
- CORS for cross-origin request configuration
- tsx for development

## 2. Prerequisites

Install the following before running the project:

- Node.js and npm
- MongoDB Community Server, running locally, or an authorized development MongoDB instance
- MongoDB Compass (optional, for viewing database collections)
- Git
- Postman (recommended for API testing)

Check your installations:

```powershell
node --version
npm --version
git --version
```

## 3. Getting Started

### Clone the repository

```powershell
git clone https://github.com/Github-codes24/DBMS_SuperAdmin_BE.git
cd DBMS_SuperAdmin_BE
```

### Install dependencies

```powershell
npm install
```

### Configure environment variables

Create a `.env` file in the project root.

```env
NODE_ENV=development
PORT=3007
MONGODB_URI=mongodb://127.0.0.1:27017/DBMS
FRONTEND_URL=http://localhost:5173

JWT_ACCESS_SECRET=replace_with_a_random_secret_of_at_least_32_characters
JWT_ACCESS_EXPIRES_IN=15m

SUPERADMIN_NAME=Platform Super Admin
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_PASSWORD=replace_with_a_strong_password_of_at_least_12_characters
```

Replace the example email and password with your own development credentials. Use a strong, unique JWT secret.

**Security:** Never commit `.env` or share its secrets in source code, logs, screenshots, or pull requests. Each developer should use their own local environment configuration.

### Start MongoDB

Ensure your local MongoDB service is running and that the database URI in `.env` points to the correct instance.

MongoDB creates the database and collection when data is first written if they do not already exist.

### Create the initial Super Admin

Run this command only when bootstrapping a fresh development database:

```powershell
npm run bootstrap:superadmin
```

The script creates a Super Admin using the `SUPERADMIN_NAME`, `SUPERADMIN_EMAIL`, and `SUPERADMIN_PASSWORD` environment variables.

The script cancels if a Super Admin already exists. If the configured email belongs to a non-Super-Admin account, resolve that conflict before retrying.

### Start the development server

```powershell
npm run dev
```

Expected local address:

`http://localhost:3007`

Health endpoint:

`GET http://localhost:3007/api/health`

## 4. Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server with file watching |
| `npm run typecheck` | Check TypeScript types without generating build files |
| `npm run build` | Compile TypeScript into `dist` |
| `npm start` | Start the compiled server |
| `npm run bootstrap:superadmin` | Create the initial Super Admin account |

Run these checks before submitting a pull request:

```powershell
npm run typecheck
npm run build
```

## 5. Project Structure

```text
DBMS_SuperAdmin_BE/
├── src/
│   ├── controllers/
│   │   └── authController.ts
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── authorizeRoles.ts
│   │   ├── errorHandler.ts
│   │   ├── notFound.ts
│   │   ├── requestContext.ts
│   │   └── validate.ts
│   ├── models/
│   │   └── User.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   └── testRoutes.ts
│   ├── scripts/
│   │   └── bootstrapSuperAdmin.ts
│   ├── services/
│   │   └── authService.ts
│   ├── utils/
│   │   ├── apiManager.ts
│   │   └── password.ts
│   ├── validators/
│   │   └── authValidator.ts
│   ├── app.ts
│   └── server.ts
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── README.md
```

This represents the current intended structure. Update it whenever files or modules change. Test routes are for development and should be removed or disabled before production deployment.

## 6. API Response Format

### Success

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {},
  "requestId": "request-id"
}
```

### Error

```json
{
  "success": false,
  "message": "Request failed",
  "error": {
    "code": "ERROR_CODE"
  },
  "requestId": "request-id"
}
```

The `data` property is included when a successful response has data. The `requestId` helps correlate client requests with server logs.

## 7. Current API Endpoints

Base URL: `http://localhost:3007`

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| GET | `/api/health` | Not required | Check API health |
| POST | `/api/auth/login` | Not required | Authenticate a user and obtain an access token |
| GET | `/api/test/protected` | Bearer token required | Test JWT authentication |
| GET | `/api/test/superadmin` | Bearer token and Super Admin role required | Test role authorization |

The `/api/test/*` endpoints are for development verification, not production business functionality.

### Login request

`POST /api/auth/login`

Header:

```text
Content-Type: application/json
```

Body:

```json
{
  "email": "admin@example.com",
  "password": "your-development-password"
}
```

On successful login, the API returns an access token in `data.accessToken`.

### Access a protected endpoint

Add the following header to a protected request:

```text
Authorization: Bearer <accessToken>
```

Use the actual token returned by the login API.

Expected behavior:

- `200 OK`: authentication and required authorization succeeded.
- `400 Bad Request`: request validation failed.
- `401 Unauthorized`: authentication is missing or invalid.
- `403 Forbidden`: the authenticated user lacks the required role.
- `404 Not Found`: the requested route does not exist.
- `500 Internal Server Error`: unexpected server error.

## 8. Authentication Flow

1. The client sends email and password to the login endpoint.
2. The backend validates the request.
3. The user is retrieved from MongoDB.
4. The password is compared with the stored bcrypt hash.
5. The backend issues a signed JWT access token.
6. The client sends the token in the Authorization header.
7. Authentication middleware verifies the token, issuer, and audience.
8. Authorization middleware checks the user's role for restricted endpoints.

The current access token expiry defaults to 15 minutes. The expiry can be configured using `JWT_ACCESS_EXPIRES_IN`.

Before production, authorization must also enforce current account status, current permissions, and project access. A signed JWT alone should not be treated as proof that an account remains active or authorized.

## 9. Git Branching Strategy

- `main`: stable, reviewed code.
- `develop`: shared integration branch.
- `feature/<feature-name>`: individual feature branches.

### Developer workflow

First, clone the repository and configure the local environment as described above.

Then:

```powershell
git switch develop
git pull origin develop
git switch -c feature/user-management-api
```

Use a descriptive feature branch name for your assigned task.

After implementation:

```powershell
npm run typecheck
npm run build
git status
git add .
git commit -m "Add user management API"
git push -u origin feature/user-management-api
```

Open a pull request from the feature branch into `develop`.

**Rules:**

1. Do not push directly to `main` or `develop`.
2. Create a feature branch for each assigned task.
3. Keep commits focused and descriptive.
4. Test changes locally before raising a PR.
5. Include endpoint details, validation, error handling, and test evidence in the PR description.
6. Never commit `.env`, passwords, JWT secrets, production credentials, or real user data.
7. Resolve review feedback before merging.
8. Promote stable, tested code from `develop` to `main` only after review.

## 10. Development Guidelines

- Keep routes, controllers, services, models, validators, and middleware separated by responsibility.
- Validate incoming request bodies, parameters, and query strings using Zod.
- Use the shared `apiManager` to maintain consistent API responses.
- Hash passwords using the shared password utility; never store plain-text passwords.
- Use authentication middleware for protected endpoints.
- Use authorization middleware for role-restricted endpoints.
- Enforce project-level access on the server, not only in the frontend.
- Avoid returning password hashes, secrets, or sensitive internal errors.
- Add appropriate indexes and handle duplicate-key errors for unique fields.
- Add tests for success cases, validation failures, unauthorized requests, and forbidden access.
- Do not use live production data for local development.

## 11. Planned Development Modules

These are planned features and should not be considered implemented until merged and tested:

1. User Management APIs
   - List, search, filter, and paginate users
   - View user details
   - Create and edit users
   - Activate and deactivate users
   - Assign roles and projects

2. Project Management
   - Register and manage projects
   - Assign users to projects
   - Enforce project-level authorization

3. Roles and Permissions
   - Define roles and permissions
   - Manage permission assignments
   - Enforce authorization consistently across APIs

4. Audit and Security
   - Track important administrative actions
   - Improve authentication and authorization enforcement
   - Add automated tests and production logging

## 12. Before Production

Before deploying to production:

- Use production-specific environment variables and secrets.
- Use a secure MongoDB connection with least-privilege database credentials.
- Remove development test endpoints.
- Verify current user status and authorization on protected requests.
- Review CORS settings and security headers.
- Add rate limiting and appropriate login-abuse protections.
- Configure monitoring, backups, and safe logging.
- Add automated tests and deployment checks.
- Never expose access tokens or credentials in logs.

## 13. Repository

GitHub: https://github.com/Github-codes24/DBMS_SuperAdmin_BE
