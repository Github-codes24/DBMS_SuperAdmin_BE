// import bcrypt from "bcrypt";
// import jwt, { type SignOptions } from "jsonwebtoken";
// import { User,RefreshSession } from "../models/User.js";
// import { verifyPassword } from "../utils/password.js";
// import { errorHandler } from "../middleware/errorHandler.js";
// import { generateRefreshToken,hashRefreshToken } from "../utils/password.js";

// export class AuthServiceError extends Error {
//   constructor(
//     message: string,
//     public readonly statusCode: number,
//     public readonly code: string,
//   ) {
//     super(message);
//     this.name = "AuthServiceError";
//   }
// }
// export interface LoginResult {
//   accessToken: string;
//   refreshToken: string;
//   tokenType: "Bearer";
//   expiresIn: string;
//   user: {
//     id: string;
//     name: string;
//     email: string;
//     role: string;
//     projectIds: string[];
//   };
// }
// export async function refreshUserTokens(refreshToken: string) {
//   const secret = process.env.JWT_REFRESH_SECRET;

//   if (!secret || secret.length < 32) {
//     throw new Error("JWT_REFRESH_SECRET is not configured correctly");
//   }

//   let userId: string;

//   // 1. Verify the refresh JWT
//   try {
//     const decoded = jwt.verify(refreshToken, secret, {
//       issuer: "dbms-superadmin-api",
//       audience: "dbms-superadmin",
//     });

//     if (
//       typeof decoded === "string" ||
//       decoded.tokenUse !== "refresh" ||
//       typeof decoded.sub !== "string"
//     ) {
//       throw new Error("Invalid refresh token");
//     }

//     userId = decoded.sub;
//   } catch {
//     throw new AuthServiceError(
//       "Invalid or expired refresh token",
//       401,
//       "INVALID_REFRESH_TOKEN",
//     );
//   }

//   // 2. Check whether the user is active
//   const user = await User.findById(userId).select(
//     "role projectIds isActive",
//   );

//   if (!user || !user.isActive) {
//     throw new AuthServiceError(
//       "Account is unavailable",
//       401,
//       "ACCOUNT_UNAVAILABLE",
//     );
//   }

//   // 3. Validate the refresh-token session in MongoDB
//   const oldTokenHash = hashRefreshToken(refreshToken);
//   const now = new Date();

//   // 4. Generate the replacement refresh token
//   const newRefreshToken = generateRefreshToken(userId);
//   const newTokenHash = hashRefreshToken(newRefreshToken);
//   const newExpiresAt = new Date(
//     now.getTime() + 7 * 24 * 60 * 60 * 1000,
//   );

//   // Atomically replace the old token hash.
//   // A reused, revoked, or expired session will not match.
//   const session = await RefreshSession.findOneAndUpdate(
//     {
//       userId: user._id,
//       tokenHash: oldTokenHash,
//       revokedAt: null,
//       expiresAt: { $gt: now },
//     },
//     {
//       $set: {
//         tokenHash: newTokenHash,
//         expiresAt: newExpiresAt,
//       },
//     },
//     { new: true },
//   );

//   if (!session) {
//     throw new AuthServiceError(
//       "Invalid, expired, or revoked refresh session",
//       401,
//       "INVALID_REFRESH_SESSION",
//     );
//   }

//   // 5. Generate a new access token
//   const accessSecret = process.env.JWT_ACCESS_SECRET;

//   if (!accessSecret || accessSecret.length < 32) {
//     throw new Error("JWT_ACCESS_SECRET is not configured correctly");
//   }

//   const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

//   const accessToken = jwt.sign(
//     {
//       role: user.role,
//       projectIds: user.projectIds,
//     },
//     accessSecret,
//     {
//       subject: user._id.toString(),
//       expiresIn: expiresIn as SignOptions["expiresIn"],
//       issuer: "dbms-superadmin-api",
//       audience: "dbms-superadmin",
//     },
//   );

//   // 6. Return BOTH replacement tokens
//   return {
//     accessToken,
//     refreshToken: newRefreshToken,
//     tokenType: "Bearer" as const,
//     expiresIn,
//   };
// }
// export async function loginUser(
//   email: string,
//   password: string,
// ): Promise<LoginResult> {
//   const user = await User.findOne({ email }).select("+passwordHash");

//   // Use the same response for an unknown email and an incorrect password.
//   if (!user) {
//     throw new AuthServiceError(
//       "Invalid email or password",
//       401,
//       "INVALID_CREDENTIALS",
//     );
//   }

//   const passwordMatches = await verifyPassword(
//     password,
//     user.passwordHash,
//   );

//   if (!passwordMatches || !user.isActive) {
//     throw new AuthServiceError(
//       "Invalid email or password",
//       401,
//       "INVALID_CREDENTIALS",
//     );
//   }

//   const secret = process.env.JWT_ACCESS_SECRET;

//   if (!secret || secret.length < 32) {
//     throw new Error(
//       "JWT_ACCESS_SECRET must be configured with at least 32 characters",
//     );
//   }

//   const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

//   const tokenOptions: SignOptions = {
//     subject: user._id.toString(),
//     expiresIn: expiresIn as SignOptions["expiresIn"],
//     issuer: "dbms-superadmin-api",
//     audience: "dbms-superadmin",
//   };

//   const accessToken = jwt.sign(
//     {
//       role: user.role,
//       projectIds: user.projectIds,
//     },
//     secret,
//     tokenOptions,
//   );
//     // refresh token generation 
//     const refreshToken = generateRefreshToken(user._id.toString());
//     // save the  hashed refresh token to  the database 
//     await RefreshSession.create({
//       userId: user._id,
//       tokenHash: hashRefreshToken(refreshToken),
//       expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//     });

//   user.lastLoginAt = new Date();
//   await user.save();


//   return {
//     accessToken,
//     refreshToken,
//     tokenType: "Bearer",
//     expiresIn,
//     user: {
//       id: user._id.toString(),
//       name: user.name,
//       email: user.email,
//       role: user.role,
//       projectIds: user.projectIds,
//     },
//   };
// }
// export async function getAdminProfile(userId: string) {

//   try {
//     const admin = await User.findById(userId).select(
//       "name email role projectIds isActive lastLoginAt createdAt",
//     );
  
//     if (!admin || admin.role !== "superadmin") {
//       throw new AuthServiceError(
//         "Platform Super Admin not found",
//         404,
//         "Platform Super Admin_NOT_FOUND",
//       );
//     }
//     if (!admin.isActive) {
//       throw new AuthServiceError(
//         "Account is inactive",
//         403,
//         "ACCOUNT_INACTIVE",
//       );
//     }
//     return {
//       id: admin._id.toString(),
//       name: admin.name,
//       email: admin.email,
//       role: admin.role,
//       projectIds: admin.projectIds,
//       lastLoginAt: admin.lastLoginAt,
//       createdAt: admin.createdAt,
//     };
    
//   } catch (error) {
//     throw error;
    
//   }
// }
// export async function logoutUser(
//   userId: string,
//   refreshToken: string,
// ): Promise<void> {
//   await RefreshSession.updateOne(
//     {
//       userId,
//       tokenHash: hashRefreshToken(refreshToken),
//       revokedAt: null,
//     },
//     {
//       $set: { revokedAt: new Date() },
//     },
//   );
// }
// export async function changePassword(
//   userId: string,
//   currentPassword: string,
//   newPassword: string,
// ): Promise<void> {
//   const user = await User.findById(userId).select("+passwordHash");

//   if (!user || !user.isActive) {
//     throw new AuthServiceError(
//       "Account is unavailable",
//       401,
//       "ACCOUNT_UNAVAILABLE",
//     );
//   }

//   const isValid = await bcrypt.compare(
//     currentPassword,
//     user.passwordHash,
//   );

//   if (!isValid) {
//     throw new AuthServiceError(
//       "Current password is incorrect",
//       401,
//       "INVALID_CURRENT_PASSWORD",
//     );
//   }

//   const isSamePassword = await bcrypt.compare(
//     newPassword,
//     user.passwordHash,
//   );

//   if (isSamePassword) {
//     throw new AuthServiceError(
//       "New password must differ from the current password",
//       400,
//       "SAME_PASSWORD",
//     );
//   }

//   user.passwordHash = await bcrypt.hash(newPassword, 12);
//   await user.save();

//   await RefreshSession.updateMany(
//     {
//       userId: user._id,
//       revokedAt: null,
//     },
//     {
//       $set: { revokedAt: new Date() },
//     },
//   );
// }

import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { User, RefreshSession } from "../models/User.js";
import { verifyPassword, generateRefreshToken, hashRefreshToken } from "../utils/password.js";

export class AuthServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    projectIds: string[];          // kept so your frontend doesn't break; now derived from projectRoles
  };
}

const ISSUER = "dbms-superadmin-api";
const AUDIENCE = "dbms-superadmin";
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** CHANGED: one place that signs access tokens. Payload is now sub + role + tv. */
function signAccessToken(user: { _id: { toString(): string }; role: string; tokenVersion: number }) {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be configured with at least 32 characters");
  }
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

  const token = jwt.sign(
    { role: user.role, tv: user.tokenVersion ?? 0 },   // informational only: the server re-reads the user on every request
    secret,
    {
      subject: user._id.toString(),
      expiresIn: expiresIn as SignOptions["expiresIn"],
      issuer: ISSUER,
      audience: AUDIENCE,
    },
  );
  return { token, expiresIn };
}

/** NEW: projectIds for the response, derived from projectRoles. */
function projectIdsOf(user: { projectRoles?: { projectId: { toString(): string }; isActive: boolean }[] }) {
  return (user.projectRoles ?? []).filter((p) => p.isActive).map((p) => p.projectId.toString());
}

export async function refreshUserTokens(refreshToken: string) {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_REFRESH_SECRET is not configured correctly");
  }

  let userId: string;
  try {
    const decoded = jwt.verify(refreshToken, secret, { issuer: ISSUER, audience: AUDIENCE });
    if (typeof decoded === "string" || decoded.tokenUse !== "refresh" || typeof decoded.sub !== "string") {
      throw new Error("Invalid refresh token");
    }
    userId = decoded.sub;
  } catch {
    throw new AuthServiceError("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  // CHANGED: select tokenVersion instead of projectIds
  const user = await User.findById(userId).select("role isActive tokenVersion");
  if (!user || !user.isActive) {
    throw new AuthServiceError("Account is unavailable", 401, "ACCOUNT_UNAVAILABLE");
  }

  const oldTokenHash = hashRefreshToken(refreshToken);
  const now = new Date();
  const newRefreshToken = generateRefreshToken(userId);
  const newTokenHash = hashRefreshToken(newRefreshToken);

  // Atomic rotation: a reused, revoked, or expired session will not match
  const session = await RefreshSession.findOneAndUpdate(
    { userId: user._id, tokenHash: oldTokenHash, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { tokenHash: newTokenHash, expiresAt: new Date(now.getTime() + REFRESH_TTL_MS) } },
    { new: true },
  );
  if (!session) {
    throw new AuthServiceError("Invalid, expired, or revoked refresh session", 401, "INVALID_REFRESH_SESSION");
  }

  const { token: accessToken, expiresIn } = signAccessToken(user);

  return { accessToken, refreshToken: newRefreshToken, tokenType: "Bearer" as const, expiresIn };
}

export async function loginUser(email: string, password: string): Promise<LoginResult> {
  // CHANGED: normalise the email, and select projectRoles + tokenVersion
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");

  if (!user) {
    throw new AuthServiceError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches || !user.isActive) {
    throw new AuthServiceError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const { token: accessToken, expiresIn } = signAccessToken(user);

  const refreshToken = generateRefreshToken(user._id.toString());
  await RefreshSession.create({
    userId: user._id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });

  user.lastLoginAt = new Date();
  await user.save();

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    expiresIn,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      projectIds: projectIdsOf(user),
    },
  };
}

export async function getAdminProfile(userId: string) {
  // CHANGED: projectRoles instead of projectIds
  const admin = await User.findById(userId).select("name email role projectRoles isActive lastLoginAt createdAt");

  if (!admin || admin.role !== "superadmin") {
    throw new AuthServiceError("Platform Super Admin not found", 404, "SUPERADMIN_NOT_FOUND");
  }
  if (!admin.isActive) {
    throw new AuthServiceError("Account is inactive", 403, "ACCOUNT_INACTIVE");
  }
  return {
    id: admin._id.toString(),
    name: admin.name,
    email: admin.email,
    role: admin.role,
    projectIds: projectIdsOf(admin),
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
  };
}

export async function logoutUser(userId: string, refreshToken: string): Promise<void> {
  await RefreshSession.updateOne(
    { userId, tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

/** NEW: kill every refresh session of a user (used when blocking, deleting, or force-logout). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await RefreshSession.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

/** NEW: SuperAdmin "log this user out everywhere": access tokens die now, refresh tokens are revoked. */
export async function logoutAll(userId: string): Promise<void> {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
  await revokeAllSessions(userId);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user || !user.isActive) {
    throw new AuthServiceError("Account is unavailable", 401, "ACCOUNT_UNAVAILABLE");
  }

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AuthServiceError("Current password is incorrect", 401, "INVALID_CURRENT_PASSWORD");
  }
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw new AuthServiceError("New password must differ from the current password", 400, "SAME_PASSWORD");
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.tokenVersion += 1;                       // NEW: existing access tokens stop working immediately
  await user.save();

  await revokeAllSessions(user._id.toString());
}


