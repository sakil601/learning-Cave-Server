import ProductAccess from "../models/ProductAccess.js";
import Product from "../models/Product.js";
import LiveCourse from "../models/LiveCourse.js";
import Batch from "../models/Batch.js";
import LiveSession from "../models/LiveSession.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

function isAccessExpired(access) {
  return access.expiresAt && new Date(access.expiresAt) < new Date();
}

export const getMyLiveCourses = asyncHandler(async (req, res) => {
  const accesses = await ProductAccess.find({
    user: req.user._id,
    status: "active",
  })
    .populate({
      path: "product",
      match: {
        type: "live_course",
        deletedAt: null,
      },
      select:
        "title slug shortDescription thumbnail regularPrice salePrice access status",
    })
    .populate({
      path: "batch",
      select: "name startDate endDate status capacity",
    })
    .sort({
      createdAt: -1,
    })
    .lean();

  const data = accesses
    .filter((access) => access.product && !isAccessExpired(access))
    .map((access) => ({
      accessId: access._id,
      product: access.product,
      batch: access.batch,
      startsAt: access.startsAt,
      expiresAt: access.expiresAt,
      accessType: access.accessType,
    }));

  res.json({
    success: true,
    data,
  });
});

export const getMyLiveCourse = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const access = await ProductAccess.findOne({
    user: req.user._id,
    product: productId,
    status: "active",
  }).lean();

  if (!access) {
    throw new ApiError(
      403,
      "LIVE_COURSE_ACCESS_DENIED",
      "You do not have access to this live course.",
    );
  }

  if (isAccessExpired(access)) {
    throw new ApiError(
      403,
      "LIVE_COURSE_ACCESS_EXPIRED",
      "Your live course access has expired.",
    );
  }

  if (!access.batch) {
    throw new ApiError(
      400,
      "BATCH_ACCESS_MISSING",
      "No batch is assigned to this live course access.",
    );
  }

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

  const liveCourse = await LiveCourse.findOne({
    product: product._id,
  })
    .populate({
      path: "instructor",
      select: "name avatar",
    })
    .lean();

  if (!liveCourse) {
    throw new ApiError(404, "LIVE_COURSE_NOT_FOUND", "Live course not found.");
  }

  const batch = await Batch.findOne({
    _id: access.batch,
    liveCourse: liveCourse._id,
  }).lean();

  if (!batch) {
    throw new ApiError(
      404,
      "BATCH_NOT_FOUND",
      "Your assigned batch was not found.",
    );
  }

  const sessions = await LiveSession.find({
    batch: batch._id,
  })
    .sort({
      classDate: 1,
      startsAt: 1,
    })
    .lean();

  const now = new Date();

  const formattedSessions = sessions.map((session) => {
    let canJoin = false;

    if (session.status === "scheduled" || session.status === "live") {
      if (session.startsAt) {
        const joinTime = new Date(session.startsAt);

        joinTime.setMinutes(
          joinTime.getMinutes() - (session.joinBeforeMinutes || 0),
        );

        canJoin =
          now >= joinTime &&
          (!session.endsAt || now <= new Date(session.endsAt));
      }
    }

    return {
      _id: session._id,
      title: session.title,
      classDate: session.classDate,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      status: session.status,

      canJoin,

      meetingUrl: canJoin ? session.meetingUrl : null,

      recording:
        session.status === "completed" && session.recording?.videoId
          ? session.recording
          : null,
    };
  });

  res.json({
    success: true,
    data: {
      access: {
        accessType: access.accessType,
        startsAt: access.startsAt,
        expiresAt: access.expiresAt,
      },

      product: {
        _id: product._id,
        title: product.title,
        slug: product.slug,
        shortDescription: product.shortDescription,
        thumbnail: product.thumbnail,
      },

      liveCourse: {
        _id: liveCourse._id,
        meetingProvider: liveCourse.meetingProvider,
        instructor: liveCourse.instructor,
      },

      batch,

      sessions: formattedSessions,
    },
  });
});
