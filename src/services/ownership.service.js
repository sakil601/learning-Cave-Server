import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import { ApiError } from '../utils/api-error.js';

export function isAdmin(user) {
  return user?.role === 'admin';
}

export async function getOwnedCourseOrThrow(courseId, user) {
  const course = await Course.findById(courseId).populate('product');
  if (!course || !course.product || course.product.deletedAt) {
    throw new ApiError(404, 'COURSE_NOT_FOUND', 'Course not found.');
  }
  if (!isAdmin(user) && String(course.instructor) !== String(user._id)) {
    throw new ApiError(403, 'COURSE_OWNERSHIP_REQUIRED', 'You can only manage your own courses.');
  }
  return course;
}

export async function getOwnedModuleOrThrow(moduleId, user) {
  const module = await Module.findById(moduleId);
  if (!module) throw new ApiError(404, 'MODULE_NOT_FOUND', 'Module not found.');
  const course = await getOwnedCourseOrThrow(module.course, user);
  return { module, course };
}

export async function getOwnedLessonOrThrow(lessonId, user) {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new ApiError(404, 'LESSON_NOT_FOUND', 'Lesson not found.');
  const { module, course } = await getOwnedModuleOrThrow(lesson.module, user);
  return { lesson, module, course };
}
