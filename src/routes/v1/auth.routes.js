import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  me,
} from "../../controllers/auth.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  registerSchema,
  loginSchema,
} from "../../validators/auth.validator.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { authLimiter } from "../../middlewares/rateLimit.middleware.js";
const router = Router();
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/refresh", authLimiter, refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
export default router;
