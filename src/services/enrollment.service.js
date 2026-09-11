import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";
import Product from "../models/Product.js";

function calculateExpiresAt(access, startsAt) {
  if (!access || access.type !== "limited") {
    return null;
  }

  const { duration, durationUnit } = access;

  if (!duration || !durationUnit) {
    return null;
  }

  const date = new Date(startsAt);

  if (durationUnit === "days") {
    date.setDate(date.getDate() + duration);
  }

  if (durationUnit === "months") {
    date.setMonth(date.getMonth() + duration);
  }

  if (durationUnit === "years") {
    date.setFullYear(date.getFullYear() + duration);
  }

  return date;
}

export async function createEnrollmentsFromPaidOrder(order) {
  const results = [];

  for (const item of order.items) {
    // শুধু recorded course-এর জন্য Enrollment তৈরি হবে
    if (item.productType !== "recorded_course") {
      continue;
    }

    const product = await Product.findById(item.product).lean();

    if (!product) {
      continue;
    }

    const course = await Course.findOne({
      product: product._id,
    }).lean();

    if (!course) {
      continue;
    }

    const startsAt = new Date();

    const expiresAt = calculateExpiresAt(product.access, startsAt);

    const enrollment = await Enrollment.findOneAndUpdate(
      {
        user: order.user,
        course: course._id,
        sourceType: "purchase",
        sourceId: order._id,
      },
      {
        $setOnInsert: {
          user: order.user,
          course: course._id,
          product: product._id,
          order: order._id,

          sourceType: "purchase",
          sourceId: order._id,

          accessType: product.access?.type || "lifetime",

          startsAt,

          expiresAt,

          status: "active",

          enrolledAt: startsAt,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    results.push(enrollment);
  }

  return results;
}
