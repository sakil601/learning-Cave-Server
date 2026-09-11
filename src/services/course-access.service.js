import Enrollment from "../models/Enrollment.js";
import Lesson from "../models/Lesson.js";
import Module from "../models/Module.js";
import { ApiError } from "../utils/api-error.js";

export async function getLessonAccess({ userId, userRole, lessonId }) {
  const lesson = await Lesson.findById(lessonId).lean();

  if (!lesson) {
    throw new ApiError(404, "LESSON_NOT_FOUND", "Lesson not found.");
  }

  // Admin সব lesson access করতে পারবে
  if (userRole === "admin") {
    return {
      allowed: true,
      lesson,
      enrollment: null,
    };
  }

  // Preview lesson
  if (lesson.isPreview) {
    return {
      allowed: true,
      lesson,
      enrollment: null,
    };
  }

  if (!userId) {
    throw new ApiError(
      401,
      "AUTH_REQUIRED",
      "Please login to access this lesson.",
    );
  }

  const module = await Module.findById(lesson.module).select("course").lean();

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
      "You are not enrolled in this course.",
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
    allowed: true,
    lesson,
    enrollment,
  };
}
