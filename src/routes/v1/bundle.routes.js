import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";

import {
  getMyBundles,
  getMyBundle,
} from "../../controllers/bundle-access.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/me", getMyBundles);

router.get("/me/:productId", getMyBundle);

export default router;
