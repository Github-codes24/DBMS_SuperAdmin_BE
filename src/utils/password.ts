
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { createHash } from "node:crypto";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

// generate refresh tokens 
export function generateRefreshToken(userId: string): string {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_REFRESH_SECRET must be configured with at least 32 characters",
    );
  }
  return jwt.sign(
    { tokenUse: "refresh" },
    secret,
    {
      subject: userId,
      expiresIn: "7d",
      issuer: "dbms-superadmin-api",
      audience: "dbms-superadmin",
    },
  );
}
// create hash 
export function hashRefreshToken(token: string): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}
