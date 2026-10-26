
import jwt, { type SignOptions } from "jsonwebtoken";
import { User } from "../models/User.js";
import { verifyPassword } from "../utils/password.js";

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
  tokenType: "Bearer";
  expiresIn: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    projectIds: string[];
  };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<LoginResult> {
  const user = await User.findOne({ email }).select("+passwordHash");

  // Use the same response for an unknown email and an incorrect password.
  if (!user) {
    throw new AuthServiceError(
      "Invalid email or password",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  const passwordMatches = await verifyPassword(
    password,
    user.passwordHash,
  );

  if (!passwordMatches || !user.isActive) {
    throw new AuthServiceError(
      "Invalid email or password",
      401,
      "INVALID_CREDENTIALS",
    );
  }

  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_ACCESS_SECRET must be configured with at least 32 characters",
    );
  }

  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

  const tokenOptions: SignOptions = {
    subject: user._id.toString(),
    expiresIn: expiresIn as SignOptions["expiresIn"],
    issuer: "dbms-superadmin-api",
    audience: "dbms-superadmin",
  };

  const accessToken = jwt.sign(
    {
      role: user.role,
      projectIds: user.projectIds,
    },
    secret,
    tokenOptions,
  );

  user.lastLoginAt = new Date();
  await user.save();

  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      projectIds: user.projectIds,
    },
  };
}
