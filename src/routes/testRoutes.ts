import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { apiManager } from "../utils/apiManager.js";

const router = Router();

router.get("/protected", authenticate, (_req, res) => {
  return apiManager.success(res, "Protected route accessed successfully", {
    authenticated: true,
    auth: res.locals.auth,
  });
});

export default router;