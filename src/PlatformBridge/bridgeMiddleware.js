/**
 * Platform Bridge Authentication Middleware
 * Validates incoming parent control plane requests using X-Platform-API-Key or Bearer token.
 */

const DEFAULT_BRIDGE_SECRET = "dbms_platform_bridge_secret_key_2026";

export const requirePlatformBridge = (req, res, next) => {
  const configuredSecret =
    process.env.PLATFORM_BRIDGE_SECRET || DEFAULT_BRIDGE_SECRET;

  const apiKeyHeader =
    req.headers["x-platform-api-key"] ||
    req.headers["x-platform-key"] ||
    req.headers["x-api-key"];

  let bearerToken = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    bearerToken = authHeader.slice(7).trim();
  }

  const providedKey = apiKeyHeader || bearerToken;

  if (!providedKey) {
    return res.status(401).json({
      success: false,
      message:
        "Unauthorized: Missing Platform Bridge credentials (X-Platform-API-Key or Bearer token required)",
    });
  }

  if (providedKey !== configuredSecret) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Invalid Platform Bridge credentials",
    });
  }

  req.isPlatformBridge = true;
  req.platformCaller = "Platform-SuperAdmin";
  next();
};

export const optionalPlatformBridge = (req, res, next) => {
  const configuredSecret =
    process.env.PLATFORM_BRIDGE_SECRET || DEFAULT_BRIDGE_SECRET;

  const apiKeyHeader =
    req.headers["x-platform-api-key"] ||
    req.headers["x-platform-key"] ||
    req.headers["x-api-key"];

  let bearerToken = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    bearerToken = authHeader.slice(7).trim();
  }

  const providedKey = apiKeyHeader || bearerToken;

  if (providedKey && providedKey === configuredSecret) {
    req.isPlatformBridge = true;
    req.platformCaller = "Platform-SuperAdmin";
  }

  next();
};
