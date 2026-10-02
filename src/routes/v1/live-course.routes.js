import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";

import {
  getMyLiveCourses,
  getMyLiveCourse,
} from "../../controllers/student-live-course.controller.js";

import {
  getPublicLiveCourseBatches,
} from "../../controllers/live-course.controller.js";

const router = Router();

router.get("/:slug/batches", getPublicLiveCourseBatches);

router.use(requireAuth);

router.get("/me", getMyLiveCourses);

router.get("/me/:productId", getMyLiveCourse);

export default router;
