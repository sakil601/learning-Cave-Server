import { asyncHandler } from "../utils/async-handler.js";
import { updateLessonProgress } from "../services/progress.service.js";
import Progress from "../models/Progress.js";
import Enrollment from "../models/Enrollment.js";
import { ApiError } from "../utils/api-error.js";

export const saveLessonProgress = asyncHandler(async (req, res) => {
  const { courseId, lessonId } = req.params;

  const { watchedSeconds = 0, completed = false } = req.body;

  const result = await updateLessonProgress({
    userId: req.user._id,
    courseId,
    lessonId,
    watchedSeconds,
    manualComplete: completed,
  });

  res.json({
    success: true,
    message: "Progress updated successfully.",
    data: result,
  });
});

export const getCourseProgress = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const enrollment = await Enrollment.findOne({
    user: req.user._id,
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

  const progress = await Progress.findOne({
    user: req.user._id,
    course: courseId,
  })
    .populate("lastLesson", "title order")
    .populate("completedLessons", "title order")
    .populate("completedModules", "title order")
    .populate("lessonProgress.lesson", "title order video.duration")
    .lean();

  if (!progress) {
    return res.json({
      success: true,
      data: {
        progressPercent: 0,
        completedLessons: [],
        completedModules: [],
        lessonProgress: [],
        lastLesson: null,
        lastAccessedAt: null,
        completedAt: null,
      },
    });
  }

  res.json({
    success: true,
    data: {
      id: progress._id,
      progressPercent: progress.progressPercent,
      completedLessons: progress.completedLessons,
      completedModules: progress.completedModules,
      lessonProgress: progress.lessonProgress,
      lastLesson: progress.lastLesson,
      lastAccessedAt: progress.lastAccessedAt,
      completedAt: progress.completedAt,
    },
  });
});
