import { Router } from "express";
import { getReport } from "../controllers/reportController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.get("/",authenticate, getReport);

export default router;