import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";

import {
  getMyEbooks,
  getMyEbook,
  downloadMyEbook,
} from "../../controllers/ebook-access.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/me", getMyEbooks);

router.get("/me/:productId", getMyEbook);

router.get("/me/:productId/download", downloadMyEbook);

export default router;
