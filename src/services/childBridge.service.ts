import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { Project } from "../models/Project.js";
import { httpError } from "../utils/httpError.js";

const DEFAULT_BRIDGE_SECRET = "dbms_platform_bridge_secret_key_2026";

export interface ChildBridgeHealthResult {
  isHealthy: boolean;
  latencyMs: number;
  lastCheckedAt: Date;
  errorMessage?: string;
  version?: string;
  raw?: Record<string, unknown>;
}

export async function pingChildHealth(config: {
  baseUrl: string;
  bridgePrefix?: string;
  secretKeyId?: string;
  timeoutMs?: number;
}): Promise<ChildBridgeHealthResult> {
  if (!config.baseUrl) {
    return {
      isHealthy: false,
      latencyMs: 0,
      lastCheckedAt: new Date(),
      errorMessage: "Child backend base URL is not configured",
      version: "",
    };
  }

  const cleanBase = config.baseUrl.replace(/\/+$/, "");
  const prefix = (config.bridgePrefix || "/api/v1/platform-bridge").replace(
    /\/+$/,
    "",
  );
  const targetUrl = `${cleanBase}${prefix}/health`;
  const timeout = Math.min(Math.max(config.timeoutMs || 5000, 500), 30000);
  const secret =
    config.secretKeyId ||
    process.env.PLATFORM_BRIDGE_SECRET ||
    DEFAULT_BRIDGE_SECRET;

  const start = Date.now();
  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Platform-API-Key": secret,
        "User-Agent": "DBMS-SuperAdmin-Platform-Control-Plane",
      },
      signal: AbortSignal.timeout(timeout),
    });

    const latencyMs = Date.now() - start;
    const body = (await response.json()) as {
      success?: boolean;
      data?: { version?: string; status?: string };
    };

    if (!response.ok || !body.success) {
      return {
        isHealthy: false,
        latencyMs,
        lastCheckedAt: new Date(),
        errorMessage: `Child service responded with HTTP ${response.status}`,
        version: body.data?.version || "",
        raw: body as Record<string, unknown>,
      };
    }

    return {
      isHealthy: true,
      latencyMs,
      lastCheckedAt: new Date(),
      errorMessage: "",
      version: body.data?.version || "1.0.0",
      raw: body as Record<string, unknown>,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const error = err as Error;
    return {
      isHealthy: false,
      latencyMs,
      lastCheckedAt: new Date(),
      errorMessage:
        error.name === "TimeoutError" ? "Connection timed out" : error.message,
      version: "",
    };
  }
}

export async function checkProjectHealth(projectId: string) {
  const project = await Project.findById(projectId);
  if (!project) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found");

  if (!project.backendConfig?.baseUrl) {
    throw httpError(
      400,
      "BACKEND_NOT_CONFIGURED",
      "Child backend base URL is not configured for this project",
    );
  }

  const result = await pingChildHealth({
    baseUrl: project.backendConfig.baseUrl,
    bridgePrefix: project.backendConfig.bridgePrefix,
    secretKeyId: project.backendConfig.secretKeyId,
    timeoutMs: project.backendConfig.timeoutMs,
  });

  project.healthStatus = {
    isHealthy: result.isHealthy,
    latencyMs: result.latencyMs,
    lastCheckedAt: result.lastCheckedAt,
    errorMessage: result.errorMessage || "",
    version: result.version || "",
  };

  if (result.isHealthy) {
    if (
      project.integrationStatus === "unlinked" ||
      project.integrationStatus === "sync_failed"
    ) {
      project.integrationStatus = "connected";
    }
  } else {
    if (project.integrationStatus === "connected") {
      project.integrationStatus = "sync_failed";
    }
  }

  await project.save();
  return {
    projectId: project.projectId,
    name: project.name,
    integrationStatus: project.integrationStatus,
    healthStatus: project.healthStatus,
    diagnostics: result.raw,
  };
}

export async function fetchFromChildBridge<T = unknown>(
  projectId: string,
  endpointPath: string,
  query?: Record<string, unknown>,
): Promise<T> {
  const project = await Project.findById(projectId);
  if (!project) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found");

  if (!project.backendConfig?.baseUrl) {
    throw httpError(
      400,
      "BACKEND_NOT_CONFIGURED",
      "Child backend base URL is not configured for this project",
    );
  }

  const cleanBase = project.backendConfig.baseUrl.replace(/\/+$/, "");
  const prefix = (project.backendConfig.bridgePrefix || "/api/v1/platform-bridge").replace(
    /\/+$/,
    "",
  );
  const cleanPath = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;

  const url = new URL(`${cleanBase}${prefix}${cleanPath}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.append(k, String(v));
      }
    });
  }

  const secret =
    project.backendConfig.secretKeyId ||
    process.env.PLATFORM_BRIDGE_SECRET ||
    DEFAULT_BRIDGE_SECRET;

  const timeout = Math.min(Math.max(project.backendConfig.timeoutMs || 8000, 1000), 30000);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Platform-API-Key": secret,
        "User-Agent": "DBMS-SuperAdmin-Platform-Control-Plane",
      },
      signal: AbortSignal.timeout(timeout),
    });

    const body = (await res.json()) as { success?: boolean; data?: T; message?: string };
    if (!res.ok || body.success === false) {
      throw httpError(
        res.status >= 400 && res.status < 500 ? res.status : 502,
        "CHILD_BRIDGE_ERROR",
        body.message || `Child bridge responded with status ${res.status}`,
      );
    }

    return body.data as T;
  } catch (err: unknown) {
    const error = err as { statusCode?: number; status?: string; message?: string; name?: string };
    if (error.statusCode) throw err;
    if (error.name === "TimeoutError") {
      throw httpError(504, "BRIDGE_GATEWAY_TIMEOUT", "Child backend connection timed out");
    }
    throw httpError(
      502,
      "BRIDGE_COMMUNICATION_FAILED",
      `Unable to reach child service: ${error.message || "Network error"}`,
    );
  }
}

export async function getChildStats(projectId: string) {
  return fetchFromChildBridge(projectId, "/stats");
}

export async function getChildModules(projectId: string) {
  return fetchFromChildBridge(projectId, "/modules");
}

export async function getChildUsers(projectId: string, query?: Record<string, unknown>) {
  return fetchFromChildBridge(projectId, "/users", query);
}

export async function getChildRoles(projectId: string) {
  return fetchFromChildBridge(projectId, "/roles");
}

export async function updateChildUserStatus(
  projectId: string,
  userId: string,
  status: string,
) {
  const project = await Project.findById(projectId);
  if (!project) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found");

  if (!project.backendConfig?.baseUrl) {
    throw httpError(
      400,
      "BACKEND_NOT_CONFIGURED",
      "Child backend base URL is not configured for this project",
    );
  }

  const cleanBase = project.backendConfig.baseUrl.replace(/\/+$/, "");
  const prefix = (project.backendConfig.bridgePrefix || "/api/v1/platform-bridge").replace(
    /\/+$/,
    "",
  );
  const url = `${cleanBase}${prefix}/users/${encodeURIComponent(userId)}/status`;

  const secret =
    project.backendConfig.secretKeyId ||
    process.env.PLATFORM_BRIDGE_SECRET ||
    DEFAULT_BRIDGE_SECRET;

  const timeout = Math.min(Math.max(project.backendConfig.timeoutMs || 8000, 1000), 30000);

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Platform-API-Key": secret,
        "User-Agent": "DBMS-SuperAdmin-Platform-Control-Plane",
      },
      body: JSON.stringify({ status }),
      signal: AbortSignal.timeout(timeout),
    });

    const body = (await res.json()) as { success?: boolean; message?: string; data?: unknown };
    if (!res.ok || body.success === false) {
      throw httpError(
        res.status >= 400 && res.status < 500 ? res.status : 502,
        "CHILD_BRIDGE_ERROR",
        body.message || `Child bridge responded with status ${res.status}`,
      );
    }

    return body.data || body;
  } catch (err: unknown) {
    const error = err as { statusCode?: number; status?: string; message?: string; name?: string };
    if (error.statusCode) throw err;
    if (error.name === "TimeoutError") {
      throw httpError(504, "BRIDGE_GATEWAY_TIMEOUT", "Child backend connection timed out");
    }
    throw httpError(
      502,
      "BRIDGE_COMMUNICATION_FAILED",
      `Unable to reach child service: ${error.message || "Network error"}`,
    );
  }
}

export async function updateChildRolePermissions(
  projectId: string,
  roleId: string,
  permissions: unknown,
) {
  const project = await Project.findById(projectId);
  if (!project) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found");

  if (!project.backendConfig?.baseUrl) {
    throw httpError(
      400,
      "BACKEND_NOT_CONFIGURED",
      "Child backend base URL is not configured for this project",
    );
  }

  const cleanBase = project.backendConfig.baseUrl.replace(/\/+$/, "");
  const prefix = (project.backendConfig.bridgePrefix || "/api/v1/platform-bridge").replace(
    /\/+$/,
    "",
  );
  const url = `${cleanBase}${prefix}/roles/${encodeURIComponent(roleId)}/permissions`;

  const secret =
    project.backendConfig.secretKeyId ||
    process.env.PLATFORM_BRIDGE_SECRET ||
    DEFAULT_BRIDGE_SECRET;

  const timeout = Math.min(Math.max(project.backendConfig.timeoutMs || 8000, 1000), 30000);

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Platform-API-Key": secret,
        "User-Agent": "DBMS-SuperAdmin-Platform-Control-Plane",
      },
      body: JSON.stringify({ permissions }),
      signal: AbortSignal.timeout(timeout),
    });

    const body = (await res.json()) as { success?: boolean; message?: string; data?: unknown };
    if (!res.ok || body.success === false) {
      throw httpError(
        res.status >= 400 && res.status < 500 ? res.status : 502,
        "CHILD_BRIDGE_ERROR",
        body.message || `Child bridge responded with status ${res.status}`,
      );
    }

    return body.data || body;
  } catch (err: unknown) {
    const error = err as { statusCode?: number; status?: string; message?: string; name?: string };
    if (error.statusCode) throw err;
    if (error.name === "TimeoutError") {
      throw httpError(504, "BRIDGE_GATEWAY_TIMEOUT", "Child backend connection timed out");
    }
    throw httpError(
      502,
      "BRIDGE_COMMUNICATION_FAILED",
      `Unable to reach child service: ${error.message || "Network error"}`,
    );
  }
}


export interface SsoLaunchResult {
  launchUrl: string;
  ticket: string;
  appKey: string;
  appName: string;
  expiresInSeconds: number;
}

export async function launchSsoSession(
  projectId: string,
  actor: { id: string; email?: string; name?: string; role?: string },
  options?: { appKey?: string; targetRoute?: string },
): Promise<SsoLaunchResult> {
  const project = await Project.findById(projectId);
  if (!project) throw httpError(404, "PROJECT_NOT_FOUND", "Project not found");

  const apps = project.frontendApps || [];
  let targetApp = options?.appKey
    ? apps.find((a) => a.appKey === options.appKey)
    : apps.find((a) => a.isDefault) || apps[0];

  if (!targetApp) {
    throw httpError(
      400,
      "APP_NOT_CONFIGURED",
      "No child frontend applications configured for this project",
    );
  }

  const secret =
    project.backendConfig?.secretKeyId ||
    process.env.PLATFORM_BRIDGE_SECRET ||
    DEFAULT_BRIDGE_SECRET;

  const nonce = randomUUID();
  const nowUnix = Math.floor(Date.now() / 1000);
  const expiresInSeconds = 60;

  const ticketPayload = {
    iss: "platform-control-plane",
    aud: project.projectCode || "LTS",
    sub: actor.id,
    email: actor.email || "superadmin@platform.internal",
    name: actor.name || "Platform Super Admin",
    role: actor.role || "SUPER_ADMIN",
    appKey: targetApp.appKey,
    targetRoute: options?.targetRoute || "/dashboard",
    nonce,
    iat: nowUnix,
    exp: nowUnix + expiresInSeconds,
  };

  const ticket = jwt.sign(ticketPayload, secret);
  const cleanBase = targetApp.baseUrl.replace(/\/+$/, "");
  const callbackPath = (targetApp.ssoCallbackPath || "/sso/callback").startsWith("/")
    ? (targetApp.ssoCallbackPath || "/sso/callback")
    : `/${targetApp.ssoCallbackPath || "/sso/callback"}`;

  const launchUrl = `${cleanBase}${callbackPath}?ticket=${encodeURIComponent(ticket)}`;

  return {
    launchUrl,
    ticket,
    appKey: targetApp.appKey,
    appName: targetApp.name,
    expiresInSeconds,
  };
}


