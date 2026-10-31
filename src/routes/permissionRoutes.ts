
import { Router } from "express";
import {
  createPermission,
  getPermissions,
} from "../controllers/permissionController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.post("/", createPermission);
router.get("/", getPermissions);

export default router;
