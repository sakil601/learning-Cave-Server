import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";

import {
  getMyWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from "../../controllers/wishlist.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", getMyWishlist);

router.post("/", addToWishlist);

router.delete("/:productId", removeFromWishlist);

router.delete("/", clearWishlist);

export default router;
