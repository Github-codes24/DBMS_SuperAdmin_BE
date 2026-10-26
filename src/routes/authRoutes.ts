
import { Router } from "express";
import { login, refreshToken,logout,getAdminProfile, changePasswordController } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { changePasswordSchema, loginSchema } from "../validators/authValidator.js";
// import { getAdminProfile } from "../controllers/authController.js";
import { authenticate } from "../middleware/authenticate.js";
import { changePassword } from "../services/authService.js";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.post("/refresh", refreshToken);
router.get("/getAdmin", authenticate, getAdminProfile);
router.post("/logout", authenticate, logout);
router.patch(
    "/change-password",
    authenticate,
    validate(changePasswordSchema),
   changePasswordController
    
  );

export default router;
