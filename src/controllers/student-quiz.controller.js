import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";
import QuizAttempt from "../models/QuizAttempt.js";
import Module from "../models/Module.js";
import Enrollment from "../models/Enrollment.js";
import Progress from "../models/Progress.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

import { recalculateCourseProgress } from "../services/progress.service.js";

async function getQuizAccess({ userId, quizId }) {
  const quiz = await Quiz.findOne({
    _id: quizId,
    active: true,
  }).lean();

  if (!quiz) {
    throw new ApiError(404, "QUIZ_NOT_FOUND", "Quiz not found.");
  }

  const module = await Module.findById(quiz.module).lean();

  if (!module) {
    throw new ApiError(404, "MODULE_NOT_FOUND", "Module not found.");
  }

  const enrollment = await Enrollment.findOne({
    user: userId,
    course: module.course,
    status: "active",
  }).lean();

  if (!enrollment) {
    throw new ApiError(
      403,
      "COURSE_ACCESS_DENIED",
      "You do not have access to this course.",
    );
  }

  if (enrollment.expiresAt && new Date(enrollment.expiresAt) < new Date()) {
    throw new ApiError(
      403,
      "COURSE_ACCESS_EXPIRED",
      "Your course access has expired.",
    );
  }

  return {
    quiz,
    module,
    enrollment,
  };
}

export const getStudentQuiz = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  const { quiz } = await getQuizAccess({
    userId: req.user._id,
    quizId,
  });

  const perfectAttempt = await QuizAttempt.findOne({
    user: req.user._id,
    quiz: quizId,
    percentage: 100,
    submittedAt: { $ne: null },
  })
    .select("_id percentage submittedAt")
    .lean();

  if (perfectAttempt) {
    return res.json({
      success: true,
      data: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          required: quiz.required,
        },
        completed: true,
        percentage: 100,
        questions: [],
      },
    });
  }

  const questions = await Question.find({
    quiz: quizId,
  })
    .select("question marks order")
    .sort({ order: 1 })
    .lean();

  if (quiz.randomizeQuestions) {
    questions.sort(() => Math.random() - 0.5);
  }

  res.json({
    success: true,
    data: {
      quiz: {
        id: quiz._id,
        title: quiz.title,
        timeLimitMinutes: quiz.timeLimitMinutes,
        required: quiz.required,
        showResult: quiz.showResult,
      },
      completed: false,
      questions,
    },
  });
});

export const startQuizAttempt = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  const { quiz, enrollment } = await getQuizAccess({
    userId: req.user._id,
    quizId,
  });

  const completedAttempt = await QuizAttempt.findOne({
    user: req.user._id,
    quiz: quizId,
    percentage: 100,
    submittedAt: { $ne: null },
  }).lean();

  if (completedAttempt) {
    throw new ApiError(
      400,
      "QUIZ_ALREADY_COMPLETED",
      "You have already completed this quiz.",
    );
  }

  const existingOpenAttempt = await QuizAttempt.findOne({
    user: req.user._id,
    quiz: quizId,
    submittedAt: null,
  });

  if (existingOpenAttempt) {
    if (quiz.timeLimitMinutes) {
      const deadline =
        new Date(existingOpenAttempt.startedAt).getTime() +
        quiz.timeLimitMinutes * 60 * 1000;

      if (Date.now() > deadline) {
        existingOpenAttempt.score = 0;
        existingOpenAttempt.totalMarks = 0;
        existingOpenAttempt.percentage = 0;
        existingOpenAttempt.passed = false;
        existingOpenAttempt.submittedAt = new Date();

        await existingOpenAttempt.save();
      } else {
        return res.json({
          success: true,
          message: "Existing quiz attempt returned.",
          data: existingOpenAttempt,
        });
      }
    } else {
      return res.json({
        success: true,
        message: "Existing quiz attempt returned.",
        data: existingOpenAttempt,
      });
    }
  }

  const previousAttempts = await QuizAttempt.countDocuments({
    user: req.user._id,
    quiz: quizId,
    submittedAt: { $ne: null },
  });

  const attempt = await QuizAttempt.create({
    user: req.user._id,
    quiz: quizId,
    enrollment: enrollment._id,
    attemptNumber: previousAttempts + 1,
    answers: [],
    startedAt: new Date(),
  });

  res.status(201).json({
    success: true,
    message: "Quiz attempt started.",
    data: attempt,
  });
});

export const submitQuizAttempt = asyncHandler(async (req, res) => {
  const { quizId, attemptId } = req.params;
  const { answers } = req.body;

  const { quiz, module } = await getQuizAccess({
    userId: req.user._id,
    quizId,
  });

  const alreadyCompleted = await QuizAttempt.findOne({
    user: req.user._id,
    quiz: quizId,
    percentage: 100,
    submittedAt: { $ne: null },
  }).lean();

  if (alreadyCompleted) {
    throw new ApiError(
      400,
      "QUIZ_ALREADY_COMPLETED",
      "You have already completed this quiz.",
    );
  }

  if (!Array.isArray(answers)) {
    throw new ApiError(400, "INVALID_ANSWERS", "answers must be an array.");
  }

  const attempt = await QuizAttempt.findOne({
    _id: attemptId,
    user: req.user._id,
    quiz: quizId,
  });

  if (!attempt) {
    throw new ApiError(
      404,
      "QUIZ_ATTEMPT_NOT_FOUND",
      "Quiz attempt not found.",
    );
  }

  if (attempt.submittedAt) {
    throw new ApiError(
      400,
      "QUIZ_ALREADY_SUBMITTED",
      "This quiz attempt has already been submitted.",
    );
  }

  if (quiz.timeLimitMinutes) {
    const deadline =
      new Date(attempt.startedAt).getTime() + quiz.timeLimitMinutes * 60 * 1000;

    if (Date.now() > deadline) {
      attempt.score = 0;
      attempt.totalMarks = 0;
      attempt.percentage = 0;
      attempt.passed = false;
      attempt.submittedAt = new Date();

      await attempt.save();

      throw new ApiError(
        400,
        "QUIZ_TIME_EXPIRED",
        "Quiz time limit has expired.",
      );
    }
  }

  const questions = await Question.find({
    quiz: quizId,
  }).lean();

  if (questions.length === 0) {
    throw new ApiError(400, "QUIZ_HAS_NO_QUESTIONS", "Quiz has no questions.");
  }

  const questionMap = new Map(questions.map((q) => [String(q._id), q]));

  const seenQuestions = new Set();
  const evaluatedAnswers = [];

  for (const item of answers) {
    const questionId = String(item.question);

    if (seenQuestions.has(questionId)) {
      throw new ApiError(
        400,
        "DUPLICATE_ANSWER",
        "Duplicate answer submitted.",
      );
    }

    seenQuestions.add(questionId);

    const question = questionMap.get(questionId);

    if (!question) {
      throw new ApiError(
        400,
        "INVALID_QUESTION",
        "One or more questions do not belong to this quiz.",
      );
    }

    if (typeof item.answer !== "boolean") {
      throw new ApiError(
        400,
        "INVALID_ANSWER",
        "Quiz answers must be true or false.",
      );
    }

    const correct = item.answer === question.correctAnswer;

    evaluatedAnswers.push({
      question: question._id,
      answer: item.answer,
      correct,
      marksEarned: correct ? question.marks : 0,
    });
  }

  const totalMarks = questions.reduce(
    (sum, question) => sum + (question.marks || 0),
    0,
  );

  const score = evaluatedAnswers.reduce(
    (sum, answer) => sum + (answer.marksEarned || 0),
    0,
  );

  const percentage =
    totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  const passed = percentage === 100;

  attempt.answers = evaluatedAnswers;
  attempt.score = score;
  attempt.totalMarks = totalMarks;
  attempt.percentage = percentage;
  attempt.passed = passed;
  attempt.submittedAt = new Date();

  await attempt.save();

  const progress = await Progress.findOne({
    user: req.user._id,
    course: module.course,
  });

  if (progress) {
    await recalculateCourseProgress({
      userId: req.user._id,
      courseId: module.course,
      progress,
    });
  }

  const response = {
    success: true,
    message: passed
      ? "Quiz completed successfully."
      : "Quiz submitted. Try again to get 100%.",
    data: {
      attemptId: attempt._id,
      attemptNumber: attempt.attemptNumber,
      score,
      totalMarks,
      percentage,
      passed,
      completed: passed,
      canRetry: !passed,
    },
  };

  if (quiz.showResult) {
    response.data.answers = evaluatedAnswers.map((answer) => ({
      question: answer.question,
      answer: answer.answer,
      correct: answer.correct,
      marksEarned: answer.marksEarned,
    }));
  }

  if (quiz.showCorrectAnswer) {
    response.data.correctAnswers = questions.map((question) => ({
      question: question._id,
      correctAnswer: question.correctAnswer,
    }));
  }

  res.json(response);
});
