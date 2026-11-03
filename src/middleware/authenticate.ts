// import type { RequestHandler } from "express";
// import jwt, { type JwtPayload } from "jsonwebtoken";
// import { apiManager } from "../utils/apiManager.js";


// interface AccessTokenPayload extends JwtPayload {
//   role: string;
//   projectIds: string[];
// }
// export const authenticate: RequestHandler = (req, res, next) => {
//   const token = apiManager.getBearerToken(req);

//   if (!token) {
//     return apiManager.failure(
//       res,
//       "Authentication required",
//       401,
//       "AUTHENTICATION_REQUIRED",
//     );
//   }

//   const secret = process.env.JWT_ACCESS_SECRET;

//   if (!secret || secret.length < 32) {
//     return next(
//       new Error(
//         "JWT_ACCESS_SECRET must be configured with at least 32 characters",
//       ),
//     );
//   }

//   try {
//     const payload = jwt.verify(token, secret, {
//       issuer: "dbms-superadmin-api",
//       audience: "dbms-superadmin",
//     }) as AccessTokenPayload;

//     res.locals.auth = {
//       userId: payload.sub,
//       role: payload.role,
//       projectIds: payload.projectIds ?? [],
//     };

//     next();
//   } catch {
//     return apiManager.failure(
//       res,
//       "Invalid or expired access token",
//       401,
//       "INVALID_ACCESS_TOKEN",
//     );
//   }
// };
import { RequestHandler } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "../models/User.js";
import { httpError } from "../utils/httpError.js";
import type { AuthUser } from "../types/express.types.js"


interface AccessTokenPayload extends JwtPayload {
  role: string;
  projectIds: string[];
}
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw httpError(401, "UNAUTHORIZED", "Missing access token");

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error("JWT_ACCESS_SECRET is not configured");

    let payload: jwt.JwtPayload;
    try {
      const decoded = jwt.verify(header.slice(7),
       secret,
        { issuer: "dbms-superadmin-api",
         audience: "dbms-superadmin" }
         );
      if (typeof decoded === "string" || typeof decoded.sub !== "string") throw new Error("bad payload");
      payload = decoded;
    } catch {
      throw httpError(401, "INVALID_TOKEN", "Invalid or expired access token");
    }

    // Read the user from the DB on EVERY request. This is what makes revocation instant.
    const user = await User.findById(payload.sub).select("name email role isActive tokenVersion projectRoles");
    if (!user || !user.isActive || user.tokenVersion !== (payload.tv ?? 0)) {
      throw httpError(401, "SESSION_REVOKED", "Session is no longer valid");
    }

    req.user = user as unknown as AuthUser;
    // Compatibility with older middleware that reads res.locals.auth
    _res.locals.auth = {
      userId: String(user._id),
      role: user.role,
      projectIds: user.projectRoles.filter((p) => p.isActive).map((p) => String(p.projectId)),
    };
    next();
  } catch (e) {
    next(e);
  }
};