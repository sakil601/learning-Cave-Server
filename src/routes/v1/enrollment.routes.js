import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  getMyEnrollments,
  getMyEnrollmentCourse,
} from "../../controllers/enrollment.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/me", getMyEnrollments);
router.get("/me/:courseId", getMyEnrollmentCourse);

export default router;
