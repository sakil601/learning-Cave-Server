import { Router } from "express";

import { requireAuth, allowRoles } from "../../middlewares/auth.middleware.js";

import {
  createPayment,
  markPaymentPaid,
  initiateSSLCommerz,
  sslcommerzSuccess,
  sslcommerzFail,
  sslcommerzCancel,
  sslcommerzIpn,
} from "../../controllers/payment.controller.js";

const router = Router();

// Student creates payment
router.post("/", requireAuth, createPayment);

// Temporary admin/test endpoint
router.patch("/:id/paid", requireAuth, allowRoles("admin"), markPaymentPaid);
router.post("/sslcommerz/initiate", requireAuth, initiateSSLCommerz);
router.post("/sslcommerz/success", sslcommerzSuccess);

router.post("/sslcommerz/fail", sslcommerzFail);

router.post("/sslcommerz/cancel", sslcommerzCancel);

router.post("/sslcommerz/ipn", sslcommerzIpn);

export default router;
