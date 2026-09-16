import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";
import Module from "../models/Module.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

export const createQuiz = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;

  const {
    title,
    passPercentage = 80,
    timeLimitMinutes,
    maxAttempts = 1,
    required = false,
    showResult = true,
    showCorrectAnswer = false,
    randomizeQuestions = false,
    active = true,
  } = req.body;

  const module = await Module.findById(moduleId);

  if (!module) {
    throw new ApiError(404, "MODULE_NOT_FOUND", "Module not found.");
  }

  const existingQuiz = await Quiz.findOne({
    module: moduleId,
  });

  if (existingQuiz) {
    throw new ApiError(
      400,
      "QUIZ_ALREADY_EXISTS",
      "A quiz already exists for this module.",
    );
  }

  const quiz = await Quiz.create({
    module: moduleId,
    title,
    passPercentage,
    timeLimitMinutes,
    maxAttempts,
    required,
    showResult,
    showCorrectAnswer,
    randomizeQuestions,
    active,
  });

  res.status(201).json({
    success: true,
    message: "Quiz created successfully.",
    data: quiz,
  });
});

export const addQuestion = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  const { question, correctAnswer, marks = 1, order = 0 } = req.body;

  const quiz = await Quiz.findById(quizId);

  if (!quiz) {
    throw new ApiError(404, "QUIZ_NOT_FOUND", "Quiz not found.");
  }

  if (typeof correctAnswer !== "boolean") {
    throw new ApiError(
      400,
      "INVALID_CORRECT_ANSWER",
      "correctAnswer must be true or false.",
    );
  }

  const createdQuestion = await Question.create({
    quiz: quizId,
    question,
    correctAnswer,
    marks,
    order,
  });

  res.status(201).json({
    success: true,
    message: "Question added successfully.",
    data: createdQuestion,
  });
});

export const getManagedQuiz = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  const quiz = await Quiz.findById(quizId).lean();

  if (!quiz) {
    throw new ApiError(404, "QUIZ_NOT_FOUND", "Quiz not found.");
  }

  const questions = await Question.find({
    quiz: quizId,
  })
    .sort({ order: 1 })
    .lean();

  res.json({
    success: true,
    data: {
      quiz,
      questions,
    },
  });
});
