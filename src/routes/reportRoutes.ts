import { Router } from "express";
import { getReport,  exportReport,  getRolesReportController,} from "../controllers/reportController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.get("/",authenticate, getReport);
router.get("/export", authenticate, exportReport);
router.get("/roles", authenticate, getRolesReportController);

export default router;