import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  createOrder,
  createOrderFromCart,
} from "../../controllers/order.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/", createOrder);
router.post("/", createOrder);

router.post("/from-cart", createOrderFromCart);

export default router;
