import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";

import {
  createOrder,
  createOrderFromCart,
  getMyOrders,
  getMyOrder,
} from "../../controllers/order.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/me", getMyOrders);
router.get("/me/:id", getMyOrder);

router.post("/", createOrder);
router.post("/from-cart", createOrderFromCart);

export default router;
