import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import { createOrder } from "../../controllers/order.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/", createOrder);

export default router;
