import Progress from "../models/Progress.js";
import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";
import { ApiError } from "../utils/api-error.js";
import { issueCertificateIfEligible } from "./certificate.service.js";

export async function recalculateCourseProgress({
  userId,
  courseId,
  progress,
}) {
  const modules = await Module.find({
    course: courseId,
  })
    .select("_id required")
    .lean();

  const moduleIds = modules.map((item) => item._id);

  const allLessons = await Lesson.find({
    module: { $in: moduleIds },
  })
    .select("_id module required")
    .lean();

  const requiredLessons = allLessons.filter((item) => item.required !== false);

  const completedRequiredLessons = requiredLessons.filter((item) =>
    progress.completedLessons.some((id) => String(id) === String(item._id)),
  );

  const requiredQuizzes = await Quiz.find({
    module: { $in: moduleIds },
    required: true,
    active: true,
  })
    .select("_id module")
    .lean();

  const requiredQuizIds = requiredQuizzes.map((quiz) => quiz._id);

  const passedQuizAttempts =
    requiredQuizIds.length > 0
      ? await QuizAttempt.find({
          user: userId,
          quiz: { $in: requiredQuizIds },
          passed: true,
          submittedAt: { $ne: null },
        })
          .select("quiz")
          .lean()
      : [];

  const passedQuizIds = new Set(
    passedQuizAttempts.map((attempt) => String(attempt.quiz)),
  );

  const completedModules = [];

  for (const courseModule of modules) {
    const moduleLessons = allLessons.filter(
      (item) =>
        String(item.module) === String(courseModule._id) &&
        item.required !== false,
    );

    const lessonsComplete =
      moduleLessons.length === 0 ||
      moduleLessons.every((item) =>
        progress.completedLessons.some((id) => String(id) === String(item._id)),
      );

    const moduleRequiredQuizzes = requiredQuizzes.filter(
      (quiz) => String(quiz.module) === String(courseModule._id),
    );

    const quizzesComplete =
      moduleRequiredQuizzes.length === 0 ||
      moduleRequiredQuizzes.every((quiz) =>
        passedQuizIds.has(String(quiz._id)),
      );

    if (lessonsComplete && quizzesComplete) {
      completedModules.push(courseModule._id);
    }
  }

  progress.completedModules = completedModules;

  const requiredModules = modules.filter((item) => item.required !== false);

  const completedRequiredModules = requiredModules.filter((item) =>
    completedModules.some((id) => String(id) === String(item._id)),
  );

  progress.progressPercent =
    requiredModules.length > 0
      ? Math.round(
          (completedRequiredModules.length / requiredModules.length) * 100,
        )
      : 0;

  const courseComplete =
    requiredModules.length > 0 &&
    completedRequiredModules.length === requiredModules.length;

  if (courseComplete) {
    if (!progress.completedAt) {
      progress.completedAt = new Date();
    }
  } else {
    progress.completedAt = undefined;
  }

  await progress.save();

  if (progress.progressPercent === 100) {
    await issueCertificateIfEligible({
      userId,
      courseId,
      progress,
    });
  }

  return progress;
}

export async function updateLessonProgress({
  userId,
  courseId,
  lessonId,
  watchedSeconds = 0,
  manualComplete = false,
}) {
  const enrollment = await Enrollment.findOne({
    user: userId,
    course: courseId,
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

  const course = await Course.findById(courseId).lean();

  if (!course) {
    throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  const lesson = await Lesson.findById(lessonId).lean();

  if (!lesson) {
    throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found.");
  }

  const module = await Module.findOne({
    _id: lesson.module,
    course: courseId,
  }).lean();

  if (!module) {
    throw new ApiError(
      400,
      "LESSON_NOT_IN_COURSE",
      "Lesson does not belong to this course.",
    );
  }

  let progress = await Progress.findOne({
    user: userId,
    course: courseId,
  });

  if (!progress) {
    progress = await Progress.create({
      user: userId,
      course: courseId,
      enrollment: enrollment._id,
      completedLessons: [],
      completedModules: [],
      lessonProgress: [],
      progressPercent: 0,
    });
  }

  const existingLessonProgress = progress.lessonProgress.find(
    (item) => String(item.lesson) === String(lessonId),
  );

  const previousWatched = existingLessonProgress?.watchedSeconds || 0;

  const safeWatchedSeconds = Math.max(
    previousWatched,
    Number(watchedSeconds) || 0,
  );

  const duration = Number(lesson.video?.duration) || 0;

  const threshold = course.completion?.autoCompleteVideoPercentage || 90;

  const watchedPercentage =
    duration > 0 ? Math.min(100, (safeWatchedSeconds / duration) * 100) : 0;

  const shouldComplete =
    manualComplete === true || watchedPercentage >= threshold;

  if (existingLessonProgress) {
    existingLessonProgress.watchedSeconds = safeWatchedSeconds;

    if (shouldComplete && !existingLessonProgress.completed) {
      existingLessonProgress.completed = true;
      existingLessonProgress.completedAt = new Date();
    }
  } else {
    progress.lessonProgress.push({
      lesson: lesson._id,
      watchedSeconds: safeWatchedSeconds,
      completed: shouldComplete,
      completedAt: shouldComplete ? new Date() : undefined,
    });
  }

  if (
    shouldComplete &&
    !progress.completedLessons.some((id) => String(id) === String(lesson._id))
  ) {
    progress.completedLessons.push(lesson._id);
  }

  progress.lastLesson = lesson._id;
  progress.lastAccessedAt = new Date();

  await recalculateCourseProgress({
    userId,
    courseId,
    progress,
  });

  return {
    progress,
    lesson: {
      id: lesson._id,
      title: lesson.title,
      watchedSeconds: safeWatchedSeconds,
      duration,
      watchedPercentage: Math.round(watchedPercentage),
      completed: shouldComplete,
    },
  };
}
