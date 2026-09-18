import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";

import { validateCoupon } from "../../controllers/coupon.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/validate", validateCoupon);

export default router;
