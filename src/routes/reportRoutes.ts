import { Router } from "express";
import { getReport,  exportReport,} from "../controllers/reportController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.get("/",authenticate, getReport);
router.get("/export", authenticate, exportReport);

export default router;