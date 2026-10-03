import Enrollment from "../models/Enrollment.js";
import { asyncHandler } from "../utils/async-handler.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import Quiz from "../models/Quiz.js";
import { ApiError } from "../utils/api-error.js";

export const getMyEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({
    user: req.user._id,
    status: "active",
  })
    .populate({
      path: "product",
      select:
        "title slug thumbnail shortDescription regularPrice salePrice access ratingSummary",
    })
    .populate({
      path: "course",
      select: "level language estimatedDuration certificate",
    })
    .sort({ enrolledAt: -1 })
    .lean();

  res.json({
    success: true,
    data: enrollments,
  });
});

export const getMyEnrollmentCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const enrollment = await Enrollment.findOne({
    user: req.user._id,
    course: courseId,
    status: "active",
  })
    .populate({
      path: "product",
      select:
        "title slug thumbnail shortDescription description categories tags access ratingSummary",
      populate: {
        path: "categories",
        select: "name slug",
      },
    })
    .populate({
      path: "course",
      select:
        "level language estimatedDuration certificate completion instructor",
      populate: {
        path: "instructor",
        select: "name avatar",
      },
    })
    .lean();

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

  const modules = await Module.find({
    course: courseId,
  })
    .select("title description order required")
    .sort({ order: 1 })
    .lean();

  const moduleIds = modules.map((module) => module._id);

  const [lessons, quizzes] = await Promise.all([
    Lesson.find({
      module: { $in: moduleIds },
    })
      .select("module title order required isPreview video.duration")
      .sort({ order: 1 })
      .lean(),

    Quiz.find({
      module: { $in: moduleIds },
      active: true,
    })
      .select(
        "module title passPercentage timeLimitMinutes maxAttempts required showResult showCorrectAnswer randomizeQuestions active",
      )
      .lean(),
  ]);

  const quizByModule = new Map(
    quizzes.map((quiz) => [String(quiz.module), quiz]),
  );

  const curriculum = modules.map((module) => ({
    ...module,
    lessons: lessons.filter(
      (lesson) => String(lesson.module) === String(module._id),
    ),
    quiz: quizByModule.get(String(module._id)) || null,
  }));

  res.json({
    success: true,
    data: {
      enrollment: {
        id: enrollment._id,
        accessType: enrollment.accessType,
        startsAt: enrollment.startsAt,
        expiresAt: enrollment.expiresAt,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
      },
      product: enrollment.product,
      course: enrollment.course,
      curriculum,
    },
  });
});
