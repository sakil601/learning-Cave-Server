import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";

import {
  getStudentQuiz,
  startQuizAttempt,
  submitQuizAttempt,
} from "../../controllers/student-quiz.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/:quizId", getStudentQuiz);

router.post("/:quizId/attempts", startQuizAttempt);

router.post("/:quizId/attempts/:attemptId/submit", submitQuizAttempt);

export default router;
