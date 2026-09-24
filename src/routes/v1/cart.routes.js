import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";

import {
  getMyCart,
  addToCart,
  removeCartItem,
  clearCart,
} from "../../controllers/cart.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", getMyCart);

router.post("/items", addToCart);

router.delete("/items/:itemId", removeCartItem);

router.delete("/", clearCart);

export default router;
