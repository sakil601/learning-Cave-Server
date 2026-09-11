import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";
import Product from "../models/Product.js";

function calculateExpiresAt(access) {
  if (!access || access.type !== "limited") {
    return null;
  }

  const { duration, durationUnit } = access;

  if (!duration || !durationUnit) {
    return null;
  }

  const date = new Date();

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

    const expiresAt = calculateExpiresAt(product.access);

    const enrollment = await Enrollment.findOneAndUpdate(
      {
        user: order.user,
        course: course._id,
      },
      {
        $set: {
          product: product._id,
          order: order._id,
          sourceType: "purchase",
          sourceId: order._id,
          accessType: product.access?.type || "lifetime",
          startsAt: new Date(),
          expiresAt,
          status: "active",
        },

        $setOnInsert: {
          user: order.user,
          course: course._id,
          enrolledAt: new Date(),
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
