import express from "express";
import {
  getBridgeHealth,
  getBridgeStats,
  getBridgeModules,
  getBridgeUsers,
  getBridgeRoles,
  exchangeSsoTicket,
  updateBridgeUserStatus,
} from "./bridgeController.js";
import {
  optionalPlatformBridge,
  requirePlatformBridge,
} from "./bridgeMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/v1/platform-bridge/health
 * @desc    Health check & telemetry for parent platform control plane
 * @access  Public (optional bridge credentials for elevated diagnostics)
 */
router.get("/health", optionalPlatformBridge, getBridgeHealth);

/**
 * @route   GET /api/v1/platform-bridge/stats
 * @desc    Aggregated operational statistics and KPIs
 * @access  Protected (X-Platform-API-Key or Bearer token required)
 */
router.get("/stats", requirePlatformBridge, getBridgeStats);

/**
 * @route   GET /api/v1/platform-bridge/modules
 * @desc    Child project business module directory
 * @access  Protected (X-Platform-API-Key or Bearer token required)
 */
router.get("/modules", requirePlatformBridge, getBridgeModules);

/**
 * @route   GET /api/v1/platform-bridge/users
 * @desc    Unified child project user registry
 * @access  Protected (X-Platform-API-Key or Bearer token required)
 */
router.get("/users", requirePlatformBridge, getBridgeUsers);

/**
 * @route   GET /api/v1/platform-bridge/roles
 * @desc    Child project role definitions & permission matrices
 * @access  Protected (X-Platform-API-Key or Bearer token required)
 */
router.get("/roles", requirePlatformBridge, getBridgeRoles);

/**
 * @route   POST /api/v1/platform-bridge/sso-exchange
 * @desc    Exchange signed single-use launch ticket for child session tokens
 * @access  Ticket-authenticated
 */
router.post("/sso-exchange", exchangeSsoTicket);

/**
 * @route   PATCH /api/v1/platform-bridge/users/:id/status
 * @desc    Toggle child project user status (active/inactive/blocked)
 * @access  Protected (X-Platform-API-Key or Bearer token required)
 */
router.patch("/users/:id/status", requirePlatformBridge, updateBridgeUserStatus);

export default router;

