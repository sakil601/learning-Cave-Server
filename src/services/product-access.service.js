import ProductAccess from "../models/ProductAccess.js";
import Product from "../models/Product.js";
import Batch from "../models/Batch.js";

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

export async function createProductAccessFromPaidOrder(order) {
  const results = [];

  for (const item of order.items) {
    // Recorded course Enrollment model দিয়ে handle হয়
    if (item.productType === "recorded_course") {
      continue;
    }

    // এখন শুধু live course implement করছি
    if (item.productType !== "live_course") {
      continue;
    }

    const product = await Product.findById(item.product).lean();

    if (!product) {
      continue;
    }

    if (!item.batch) {
      continue;
    }

    const batch = await Batch.findOne({
      _id: item.batch,
    }).lean();

    if (!batch) {
      continue;
    }

    const existing = await ProductAccess.findOne({
      user: order.user,
      product: product._id,
      batch: batch._id,
    });

    // আগে থেকেই valid active access থাকলে
    // duplicate access create করব না
    if (
      existing &&
      existing.status === "active" &&
      (!existing.expiresAt || existing.expiresAt > new Date())
    ) {
      results.push(existing);
      continue;
    }

    const startsAt = new Date();

    const expiresAt = calculateExpiresAt(product.access, startsAt);

    if (existing) {
      existing.order = order._id;

      existing.sourceType = "purchase";

      existing.sourceId = order._id;

      existing.accessType = product.access?.type || "lifetime";

      existing.startsAt = startsAt;

      existing.expiresAt = expiresAt;

      existing.status = "active";

      await existing.save();

      results.push(existing);

      continue;
    }

    const access = await ProductAccess.create({
      user: order.user,

      product: product._id,

      batch: batch._id,

      order: order._id,

      sourceType: "purchase",

      sourceId: order._id,

      accessType: product.access?.type || "lifetime",

      startsAt,

      expiresAt,

      status: "active",
    });

    results.push(access);
  }

  return results;
}
