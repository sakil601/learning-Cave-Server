import Review from "../models/Review.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

import { recalculateProductRating } from "../services/review.service.js";

export const createReview = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { rating, review } = req.body;

  const numericRating = Number(rating);

  if (
    !Number.isInteger(numericRating) ||
    numericRating < 1 ||
    numericRating > 5
  ) {
    throw new ApiError(
      400,
      "INVALID_RATING",
      "Rating must be an integer between 1 and 5.",
    );
  }

  const course = await Course.findById(courseId).lean();

  if (!course) {
    throw new ApiError(404, "COURSE_NOT_FOUND", "Course not found.");
  }

  const enrollment = await Enrollment.findOne({
    user: req.user._id,
    course: courseId,
    status: "active",
  }).lean();

  if (!enrollment) {
    throw new ApiError(
      403,
      "COURSE_ACCESS_DENIED",
      "Only enrolled students can review this course.",
    );
  }

  if (enrollment.expiresAt && new Date(enrollment.expiresAt) < new Date()) {
    throw new ApiError(
      403,
      "COURSE_ACCESS_EXPIRED",
      "Your course access has expired.",
    );
  }

  const existingReview = await Review.findOne({
    user: req.user._id,
    course: courseId,
  }).lean();

  if (existingReview) {
    throw new ApiError(
      400,
      "REVIEW_ALREADY_EXISTS",
      "You have already reviewed this course.",
    );
  }

  const createdReview = await Review.create({
    user: req.user._id,
    course: courseId,
    product: course.product,
    rating: numericRating,
    review: typeof review === "string" ? review.trim() : "",
  });

  const ratingSummary = await recalculateProductRating(course.product);

  res.status(201).json({
    success: true,
    message: "Review submitted successfully.",
    data: {
      review: createdReview,
      ratingSummary,
    },
  });
});

export const updateMyReview = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { rating, review } = req.body;

  const existingReview = await Review.findOne({
    user: req.user._id,
    course: courseId,
  });

  if (!existingReview) {
    throw new ApiError(404, "REVIEW_NOT_FOUND", "Review not found.");
  }

  if (rating !== undefined) {
    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      throw new ApiError(
        400,
        "INVALID_RATING",
        "Rating must be an integer between 1 and 5.",
      );
    }

    existingReview.rating = numericRating;
  }

  if (review !== undefined) {
    existingReview.review = typeof review === "string" ? review.trim() : "";
  }

  await existingReview.save();

  const ratingSummary = await recalculateProductRating(existingReview.product);

  res.json({
    success: true,
    message: "Review updated successfully.",
    data: {
      review: existingReview,
      ratingSummary,
    },
  });
});

export const getMyCourseReview = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const review = await Review.findOne({
    user: req.user._id,
    course: courseId,
  }).lean();

  res.json({
    success: true,
    data: review || null,
  });
});

export const getCourseReviews = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const reviews = await Review.find({
    course: courseId,
    status: "published",
  })
    .populate({
      path: "user",
      select: "name avatar",
    })
    .select("user rating review createdAt updatedAt")
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: reviews,
  });
});
