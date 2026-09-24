import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";

import {
  getMyDigitalProducts,
  getMyDigitalProduct,
  downloadDigitalProductFile,
} from "../../controllers/digital-product-access.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/me", getMyDigitalProducts);

router.get("/me/:productId", getMyDigitalProduct);

router.get(
  "/me/:productId/files/:assetId/download",
  downloadDigitalProductFile,
);

export default router;
