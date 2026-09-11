import { Router } from "express";

import {
  getPublicCourse,
  getLessonPlayback,
} from "../../controllers/course.controller.js";

import { validate } from "../../middlewares/validate.middleware.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

import { courseSlugSchema } from "../../validators/course.validator.js";

const router = Router();

// Protected lesson playback
router.get("/lessons/:lessonId/playback", requireAuth, getLessonPlayback);

// Public course details
router.get("/:slug", validate(courseSlugSchema), getPublicCourse);

export default router;
