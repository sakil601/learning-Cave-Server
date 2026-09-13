import { Router } from "express";

import { requireAuth, allowRoles } from "../../middlewares/auth.middleware.js";

import {
  createPayment,
  markPaymentPaid,
} from "../../controllers/payment.controller.js";

const router = Router();

// Student creates payment
router.post("/", requireAuth, createPayment);

// Temporary admin/test endpoint
router.patch("/:id/paid", requireAuth, allowRoles("admin"), markPaymentPaid);

export default router;
