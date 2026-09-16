import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";

import {
  getMyCertificates,
  verifyCertificate,
} from "../../controllers/certificate.controller.js";

const router = Router();

router.get("/verify/:certificateId", verifyCertificate);

router.get("/me", requireAuth, getMyCertificates);

export default router;
