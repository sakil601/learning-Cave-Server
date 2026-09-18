import Product from "../models/Product.js";
import LiveCourse from "../models/LiveCourse.js";
import Batch from "../models/Batch.js";
import LiveSession from "../models/LiveSession.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

export const createLiveCourse = asyncHandler(async (req, res) => {
  const { productId, instructorId, meetingProvider = "custom" } = req.body;

  const product = await Product.findOne({
    _id: productId,
    type: "live_course",
    deletedAt: null,
  }).lean();

  if (!product) {
    throw new ApiError(
      404,
      "LIVE_PRODUCT_NOT_FOUND",
      "Live course product not found.",
    );
  }

  const existing = await LiveCourse.findOne({
    product: productId,
  }).lean();

  if (existing) {
    throw new ApiError(
      400,
      "LIVE_COURSE_ALREADY_EXISTS",
      "Live course already exists for this product.",
    );
  }

  const liveCourse = await LiveCourse.create({
    product: productId,
    instructor: instructorId,
    meetingProvider,
  });

  res.status(201).json({
    success: true,
    message: "Live course created successfully.",
    data: liveCourse,
  });
});

export const createBatch = asyncHandler(async (req, res) => {
  const { liveCourseId } = req.params;

  const {
    name,
    startDate,
    endDate,
    capacity,
    enrollmentOpen,
    enrollmentClose,
  } = req.body;

  const liveCourse = await LiveCourse.findById(liveCourseId).lean();

  if (!liveCourse) {
    throw new ApiError(404, "LIVE_COURSE_NOT_FOUND", "Live course not found.");
  }

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    throw new ApiError(
      400,
      "INVALID_BATCH_DATES",
      "Batch end date must be after start date.",
    );
  }

  const batch = await Batch.create({
    liveCourse: liveCourseId,
    name,
    startDate,
    endDate,
    capacity,
    enrollmentOpen,
    enrollmentClose,
    status: "upcoming",
  });

  res.status(201).json({
    success: true,
    message: "Batch created successfully.",
    data: batch,
  });
});

export const createLiveSession = asyncHandler(async (req, res) => {
  const { batchId } = req.params;

  const {
    title,
    classDate,
    startsAt,
    endsAt,
    meetingUrl,
    joinBeforeMinutes = 15,
    recording,
  } = req.body;

  const batch = await Batch.findById(batchId).lean();

  if (!batch) {
    throw new ApiError(404, "BATCH_NOT_FOUND", "Batch not found.");
  }

  if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
    throw new ApiError(
      400,
      "INVALID_SESSION_TIME",
      "Session end time must be after start time.",
    );
  }

  const session = await LiveSession.create({
    batch: batchId,
    title,
    classDate,
    startsAt,
    endsAt,
    meetingUrl,
    joinBeforeMinutes,
    recording,
    status: "scheduled",
  });

  res.status(201).json({
    success: true,
    message: "Live session created successfully.",
    data: session,
  });
});

export const getManagedLiveCourse = asyncHandler(async (req, res) => {
  const { liveCourseId } = req.params;

  const liveCourse = await LiveCourse.findById(liveCourseId)
    .populate({
      path: "product",
      select: "title slug status regularPrice salePrice",
    })
    .populate({
      path: "instructor",
      select: "name email",
    })
    .lean();

  if (!liveCourse) {
    throw new ApiError(404, "LIVE_COURSE_NOT_FOUND", "Live course not found.");
  }

  const batches = await Batch.find({
    liveCourse: liveCourseId,
  })
    .sort({
      startDate: 1,
    })
    .lean();

  const batchIds = batches.map((batch) => batch._id);

  const sessions = await LiveSession.find({
    batch: {
      $in: batchIds,
    },
  })
    .sort({
      classDate: 1,
      startsAt: 1,
    })
    .lean();

  res.json({
    success: true,
    data: {
      liveCourse,
      batches,
      sessions,
    },
  });
});
