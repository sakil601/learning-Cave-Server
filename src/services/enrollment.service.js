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

export async function createEnrollmentsFromPaidOrder(
  order,
  { sourceType = "purchase", sourceId = order._id } = {},
) {
  const results = [];

  for (const item of order.items) {
    // শুধু recorded course-এর জন্য enrollment
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

    const existingEnrollment = await Enrollment.findOne({
      user: order.user,
      course: course._id,
    });

    // আগে থেকেই active lifetime access থাকলে কিছুই change করব না
    if (
      existingEnrollment &&
      existingEnrollment.status === "active" &&
      existingEnrollment.accessType === "lifetime"
    ) {
      results.push(existingEnrollment);
      continue;
    }

    const startsAt = new Date();

    const expiresAt = calculateExpiresAt(product.access, startsAt);

    // Existing enrollment থাকলে reactivate/update
    if (existingEnrollment) {
      existingEnrollment.product = product._id;
      existingEnrollment.order = order._id;

      existingEnrollment.sourceType = sourceType;
      existingEnrollment.sourceId = sourceId;

      existingEnrollment.accessType = product.access?.type || "lifetime";

      existingEnrollment.startsAt = startsAt;
      existingEnrollment.expiresAt = expiresAt;

      existingEnrollment.status = "active";

      await existingEnrollment.save();

      results.push(existingEnrollment);

      continue;
    }

    // প্রথমবার enrollment
    const enrollment = await Enrollment.create({
      user: order.user,
      course: course._id,
      product: product._id,
      order: order._id,

      sourceType,
      sourceId,

      accessType: product.access?.type || "lifetime",

      startsAt,
      expiresAt,

      status: "active",
      enrolledAt: startsAt,
    });

    results.push(enrollment);
  }

  return results;
}
