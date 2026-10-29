import { Router } from "express";
import {
  createProject,
  getMyProjects,
} from "../controllers/projectController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";
import { validate } from "../middleware/validate.js";
import { createProjectAdminSchema } from "../validators/projectAdminValidator.js";
import {
  createProjectAdminController,
} from "../controllers/projectAdminController.js";

const router = Router();


// --------------------------------------------------
// Routes accessible by Project Admin + SuperAdmin
// --------------------------------------------------
router.get("/me/projects", authenticate, getMyProjects);


// --------------------------------------------------
// SuperAdmin only routes
// --------------------------------------------------

router.use(authenticate, requireSuperAdmin);

router.post("/create", createProject);

router.post(
  "/:projectId/admins",
  validate(createProjectAdminSchema),
  createProjectAdminController,
);

export default router;