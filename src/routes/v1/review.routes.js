import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";

import {
  createReview,
  updateMyReview,
  getMyCourseReview,
  getCourseReviews,
} from "../../controllers/review.controller.js";

const router = Router();

// Public reviews
router.get("/courses/:courseId", getCourseReviews);

// Student own review
router.get("/courses/:courseId/me", requireAuth, getMyCourseReview);

router.post("/courses/:courseId", requireAuth, createReview);

router.patch("/courses/:courseId/me", requireAuth, updateMyReview);

export default router;
