import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  saveLessonProgress,
  getCourseProgress,
} from "../../controllers/progress.controller.js";

const router = Router();

router.use(requireAuth);

router.patch("/courses/:courseId/lessons/:lessonId", saveLessonProgress);
router.get("/courses/:courseId", getCourseProgress);

export default router;
