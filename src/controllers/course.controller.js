import mongoose from "mongoose";
import Product from "../models/Product.js";
import Course from "../models/Course.js";
import Module from "../models/Module.js";
import Lesson from "../models/Lesson.js";
import Category from "../models/Category.js";
import User from "../models/User.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { slugify } from "../utils/slugify.js";
import { getLessonAccess } from "../services/course-access.service.js";
import {
  getOwnedCourseOrThrow,
  getOwnedModuleOrThrow,
  getOwnedLessonOrThrow,
} from "../services/ownership.service.js";

async function validateCategories(ids = []) {
  if (!ids.length) return;
  const count = await Category.countDocuments({
    _id: { $in: ids },
    active: true,
  });
  if (count !== new Set(ids.map(String)).size)
    throw new ApiError(
      400,
      "INVALID_CATEGORY",
      "One or more categories are invalid or inactive.",
    );
}

function productFields(body, userId) {
  const keys = [
    "title",
    "shortDescription",
    "description",
    "thumbnail",
    "categories",
    "tags",
    "regularPrice",
    "salePrice",
    "isFree",
    "access",
    "seo",
  ];
  const out = {};
  for (const key of keys) if (body[key] !== undefined) out[key] = body[key];
  out.updatedBy = userId;
  if (out.isFree === true) {
    out.regularPrice = 0;
    out.salePrice = null;
  }
  return out;
}

export const createRecordedCourse = asyncHandler(async (req, res) => {
  const body = req.validated.body;
  await validateCategories(body.categories);
  let instructorId = req.user._id;
  if (req.user.role === "admin" && body.instructor)
    instructorId = body.instructor;
  const instructor = await User.findOne({
    _id: instructorId,
    role: "instructor",
    accountStatus: "active",
  });
  if (!instructor) {
    if (
      req.user.role === "admin" &&
      String(instructorId) === String(req.user._id)
    ) {
      throw new ApiError(
        400,
        "INSTRUCTOR_REQUIRED",
        "Admin must select an active instructor for a recorded course.",
      );
    }
    throw new ApiError(
      400,
      "INSTRUCTOR_NOT_ACTIVE",
      "An active instructor is required.",
    );
  }
  const slug = slugify(body.slug || body.title);
  if (!slug)
    throw new ApiError(
      400,
      "INVALID_SLUG",
      "A valid product slug is required.",
    );
  if (await Product.exists({ slug }))
    throw new ApiError(
      409,
      "PRODUCT_SLUG_EXISTS",
      "Product slug already exists.",
    );

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const [product] = await Product.create(
        [
          {
            ...productFields(body, req.user._id),
            type: "recorded_course",
            title: body.title,
            slug,
            status: "draft",
            createdBy: req.user._id,
          },
        ],
        { session },
      );
      const [course] = await Course.create(
        [
          {
            product: product._id,
            instructor: instructorId,
            level: body.level,
            language: body.language,
            estimatedDuration: body.estimatedDuration,
            completion: {
              autoCompleteVideoPercentage: body.autoCompleteVideoPercentage,
            },
            certificate: {
              enabled: body.certificateEnabled,
              quizPassPercentage: body.certificateQuizPassPercentage,
            },
          },
        ],
        { session },
      );
      result = { product, course };
    });
  } finally {
    await session.endSession();
  }
  res.status(201).json({
    success: true,
    message: "Recorded course created as draft.",
    data: result,
  });
});

export const listManagedCourses = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const courseFilter =
    req.user.role === "admin" ? {} : { instructor: req.user._id };
  if (req.query.instructor && req.user.role === "admin")
    courseFilter.instructor = req.query.instructor;
  const courses = await Course.find(courseFilter)
    .select("_id product instructor")
    .lean();
  const ids = courses.map((c) => c.product);
  const productFilter = { _id: { $in: ids }, deletedAt: null };
  if (req.query.status) productFilter.status = req.query.status;
  if (req.query.search)
    productFilter.$or = [
      { title: { $regex: req.query.search, $options: "i" } },
      { slug: { $regex: req.query.search, $options: "i" } },
    ];
  const total = await Product.countDocuments(productFilter);
  const products = await Product.find(productFilter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const pageCourseIds = products.map((p) => p._id);
  const courseDetails = await Course.find({ product: { $in: pageCourseIds } })
    .populate("instructor", "name email phone")
    .lean();
  const data = courseDetails
    .map((c) => ({ ...c, product: productMap.get(String(c.product)) }))
    .filter((x) => x.product);
  res.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const getManagedCourse = asyncHandler(async (req, res) => {
  const course = await getOwnedCourseOrThrow(req.validated.params.id, req.user);
  await course.populate("instructor", "name email phone");
  const modules = await Module.find({ course: course._id })
    .sort({ order: 1, createdAt: 1 })
    .lean();
  const moduleIds = modules.map((m) => m._id);
  const lessons = await Lesson.find({ module: { $in: moduleIds } })
    .sort({ order: 1, createdAt: 1 })
    .lean();
  const lessonsByModule = new Map();
  for (const lesson of lessons) {
    const key = String(lesson.module);
    if (!lessonsByModule.has(key)) lessonsByModule.set(key, []);
    lessonsByModule.get(key).push(lesson);
  }
  const curriculum = modules.map((m) => ({
    ...m,
    lessons: lessonsByModule.get(String(m._id)) || [],
  }));
  res.json({ success: true, data: { course, curriculum } });
});

export const updateRecordedCourse = asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const course = await getOwnedCourseOrThrow(req.validated.params.id, req.user);
  if (body.categories) await validateCategories(body.categories);
  if (body.instructor !== undefined) {
    if (req.user.role !== "admin")
      throw new ApiError(
        403,
        "FORBIDDEN",
        "Only admin can reassign the instructor.",
      );
    const instructor = await User.findOne({
      _id: body.instructor,
      role: "instructor",
      accountStatus: "active",
    });
    if (!instructor)
      throw new ApiError(
        400,
        "INSTRUCTOR_NOT_ACTIVE",
        "An active instructor is required.",
      );
    course.instructor = body.instructor;
  }
  if (body.slug || body.title) {
    const nextSlug = slugify(body.slug || body.title);
    const duplicate = await Product.exists({
      slug: nextSlug,
      _id: { $ne: course.product._id },
    });
    if (duplicate)
      throw new ApiError(
        409,
        "PRODUCT_SLUG_EXISTS",
        "Product slug already exists.",
      );
    course.product.slug = nextSlug;
  }
  const pPatch = productFields(body, req.user._id);
  delete pPatch.title;
  Object.assign(course.product, pPatch);
  if (body.title !== undefined) course.product.title = body.title;
  if (body.level !== undefined) course.level = body.level;
  if (body.language !== undefined) course.language = body.language;
  if (body.estimatedDuration !== undefined)
    course.estimatedDuration = body.estimatedDuration;
  if (body.autoCompleteVideoPercentage !== undefined)
    course.completion.autoCompleteVideoPercentage =
      body.autoCompleteVideoPercentage;
  if (body.certificateEnabled !== undefined)
    course.certificate.enabled = body.certificateEnabled;
  if (body.certificateQuizPassPercentage !== undefined)
    course.certificate.quizPassPercentage = body.certificateQuizPassPercentage;
  await Promise.all([course.product.save(), course.save()]);
  res.json({
    success: true,
    message: "Course updated successfully.",
    data: { product: course.product, course },
  });
});

export const submitCourseForReview = asyncHandler(async (req, res) => {
  const course = await getOwnedCourseOrThrow(req.validated.params.id, req.user);
  if (course.product.status !== "draft")
    throw new ApiError(
      409,
      "INVALID_COURSE_STATUS",
      "Only draft courses can be submitted for review.",
    );
  const moduleCount = await Module.countDocuments({ course: course._id });
  if (!moduleCount)
    throw new ApiError(
      400,
      "COURSE_HAS_NO_MODULES",
      "Add at least one module before review.",
    );
  course.product.status = "review";
  course.product.updatedBy = req.user._id;
  await course.product.save();
  res.json({
    success: true,
    message: "Course submitted for admin review.",
    data: course.product,
  });
});

export const publishCourse = asyncHandler(async (req, res) => {
  const course = await getOwnedCourseOrThrow(req.validated.params.id, req.user);
  if (!["review", "draft"].includes(course.product.status))
    throw new ApiError(
      409,
      "INVALID_COURSE_STATUS",
      "Course cannot be published from its current status.",
    );
  course.product.status = "published";
  course.product.publishedAt = new Date();
  course.product.updatedBy = req.user._id;
  await course.product.save();
  res.json({
    success: true,
    message: "Course published successfully.",
    data: course.product,
  });
});

export const rejectCourse = asyncHandler(async (req, res) => {
  const course = await getOwnedCourseOrThrow(req.validated.params.id, req.user);
  if (course.product.status !== "review")
    throw new ApiError(
      409,
      "INVALID_COURSE_STATUS",
      "Only courses under review can be rejected.",
    );
  course.product.status = "draft";
  course.product.updatedBy = req.user._id;
  await course.product.save();
  res.json({
    success: true,
    message: "Course returned to draft.",
    data: course.product,
  });
});

export const archiveCourse = asyncHandler(async (req, res) => {
  const course = await getOwnedCourseOrThrow(req.validated.params.id, req.user);
  course.product.status = "archived";
  course.product.updatedBy = req.user._id;
  await course.product.save();
  res.json({
    success: true,
    message: "Course archived.",
    data: course.product,
  });
});

export const createModule = asyncHandler(async (req, res) => {
  const course = await getOwnedCourseOrThrow(
    req.validated.params.courseId,
    req.user,
  );
  const module = await Module.create({
    ...req.validated.body,
    course: course._id,
  });
  res.status(201).json({
    success: true,
    message: "Module created successfully.",
    data: module,
  });
});

export const updateModule = asyncHandler(async (req, res) => {
  const { module } = await getOwnedModuleOrThrow(
    req.validated.params.moduleId,
    req.user,
  );
  Object.assign(module, req.validated.body);
  await module.save();
  res.json({
    success: true,
    message: "Module updated successfully.",
    data: module,
  });
});

export const deleteModule = asyncHandler(async (req, res) => {
  const { module } = await getOwnedModuleOrThrow(
    req.validated.params.moduleId,
    req.user,
  );
  await Lesson.deleteMany({ module: module._id });
  await module.deleteOne();
  res.json({
    success: true,
    message: "Module and its lessons deleted successfully.",
  });
});

export const createLesson = asyncHandler(async (req, res) => {
  const { module } = await getOwnedModuleOrThrow(
    req.validated.params.moduleId,
    req.user,
  );
  const lesson = await Lesson.create({
    ...req.validated.body,
    module: module._id,
  });
  res.status(201).json({
    success: true,
    message: "Lesson created successfully.",
    data: lesson,
  });
});

export const updateLesson = asyncHandler(async (req, res) => {
  const { lesson } = await getOwnedLessonOrThrow(
    req.validated.params.lessonId,
    req.user,
  );
  Object.assign(lesson, req.validated.body);
  await lesson.save();
  res.json({
    success: true,
    message: "Lesson updated successfully.",
    data: lesson,
  });
});

export const deleteLesson = asyncHandler(async (req, res) => {
  const { lesson } = await getOwnedLessonOrThrow(
    req.validated.params.lessonId,
    req.user,
  );
  await lesson.deleteOne();
  res.json({ success: true, message: "Lesson deleted successfully." });
});

export const getPublicCourse = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    slug: req.validated.params.slug,
    type: "recorded_course",
    status: "published",
    deletedAt: null,
  })
    .select(
      [
        "type",
        "title",
        "slug",
        "shortDescription",
        "description",
        "thumbnail",
        "gallery",
        "categories",
        "tags",
        "regularPrice",
        "salePrice",
        "isFree",
        "access",
        "ratingSummary",
        "seo",
        "publishedAt",
      ].join(" "),
    )
    .populate("categories", "name slug")
    .lean();

  if (!product) {
    throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  const course = await Course.findOne({
    product: product._id,
  })
    .select("instructor level language estimatedDuration certificate.enabled")
    .populate("instructor", "name avatar")
    .lean();

  if (!course) {
    throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  const modules = await Module.find({
    course: course._id,
  })
    .select("title description order required")
    .sort({ order: 1 })
    .lean();

  const moduleIds = modules.map((m) => m._id);

  const lessons = await Lesson.find({
    module: { $in: moduleIds },
  })
    .select("module title order isPreview required video.duration")
    .sort({ order: 1 })
    .lean();

  const curriculum = modules.map((module) => ({
    ...module,
    lessons: lessons.filter(
      (lesson) => String(lesson.module) === String(module._id),
    ),
  }));

  res.json({
    success: true,
    data: {
      product,
      course,
      curriculum,
    },
  });
});

export const getLessonPlayback = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;

  const { lesson } = await getLessonAccess({
    userId: req.user?._id,
    userRole: req.user?.role,
    lessonId,
  });

  res.json({
    success: true,
    data: {
      lesson: {
        id: lesson._id,
        title: lesson.title,
        provider: lesson.video?.provider,
        videoId: lesson.video?.videoId,
        duration: lesson.video?.duration,
        isPreview: lesson.isPreview,
      },
    },
  });
});
