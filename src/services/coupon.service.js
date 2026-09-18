import Coupon from "../models/Coupon.js";
import CouponUsage from "../models/CouponUsage.js";
import { ApiError } from "../utils/api-error.js";

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export async function validateAndCalculateCoupon({
  code,
  userId,
  items,
  subtotal,
}) {
  if (!code) {
    throw new ApiError(400, "COUPON_CODE_REQUIRED", "Coupon code is required.");
  }

  const normalizedCode = String(code).trim().toUpperCase();

  const coupon = await Coupon.findOne({
    code: normalizedCode,
    active: true,
  }).lean();

  if (!coupon) {
    throw new ApiError(
      404,
      "COUPON_NOT_FOUND",
      "Coupon not found or inactive.",
    );
  }

  const now = new Date();

  if (coupon.startsAt && new Date(coupon.startsAt) > now) {
    throw new ApiError(
      400,
      "COUPON_NOT_STARTED",
      "This coupon is not active yet.",
    );
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
    throw new ApiError(400, "COUPON_EXPIRED", "This coupon has expired.");
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(
      400,
      "COUPON_USAGE_LIMIT_REACHED",
      "Coupon usage limit has been reached.",
    );
  }

  const userUsageCount = await CouponUsage.countDocuments({
    coupon: coupon._id,
    user: userId,
  });

  if (coupon.perUserLimit && userUsageCount >= coupon.perUserLimit) {
    throw new ApiError(
      400,
      "COUPON_USER_LIMIT_REACHED",
      "You have already used this coupon the maximum allowed times.",
    );
  }

  const safeSubtotal = Number(subtotal) || 0;

  if (safeSubtotal < (Number(coupon.minOrderAmount) || 0)) {
    throw new ApiError(
      400,
      "COUPON_MIN_ORDER_NOT_MET",
      `Minimum order amount is ${coupon.minOrderAmount}.`,
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(
      400,
      "ORDER_ITEMS_REQUIRED",
      "Order items are required.",
    );
  }

  let eligibleAmount = 0;

  if (coupon.appliesTo === "all") {
    eligibleAmount = safeSubtotal;
  } else {
    const allowedProductIds = new Set(coupon.products.map((id) => String(id)));

    for (const item of items) {
      if (allowedProductIds.has(String(item.product))) {
        eligibleAmount += Number(item.lineTotal) || 0;
      }
    }

    if (eligibleAmount <= 0) {
      throw new ApiError(
        400,
        "COUPON_NOT_APPLICABLE",
        "This coupon does not apply to the selected products.",
      );
    }
  }

  let discountAmount = 0;

  if (coupon.type === "percentage") {
    discountAmount = eligibleAmount * (Number(coupon.value) / 100);
  }

  if (coupon.type === "fixed") {
    discountAmount = Number(coupon.value) || 0;
  }

  if (
    coupon.maxDiscountAmount !== undefined &&
    coupon.maxDiscountAmount !== null
  ) {
    discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
  }

  discountAmount = Math.min(discountAmount, eligibleAmount);

  discountAmount = roundMoney(discountAmount);

  const total = roundMoney(Math.max(0, safeSubtotal - discountAmount));

  return {
    coupon: {
      id: coupon._id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
    },

    eligibleAmount: roundMoney(eligibleAmount),

    discountAmount,

    subtotal: roundMoney(safeSubtotal),

    total,
  };
}

export async function recordCouponUsage({ order, userId }) {
  if (!order?.coupon?.code || !order?.coupon?.discountAmount) {
    return null;
  }

  const coupon = await Coupon.findOne({
    code: String(order.coupon.code).trim().toUpperCase(),
  });

  if (!coupon) {
    return null;
  }

  const existingUsage = await CouponUsage.findOne({
    coupon: coupon._id,
    order: order._id,
  });

  if (existingUsage) {
    return existingUsage;
  }

  const usage = await CouponUsage.create({
    coupon: coupon._id,
    user: userId,
    order: order._id,
    discountAmount: order.coupon.discountAmount,
    usedAt: new Date(),
  });

  await Coupon.findByIdAndUpdate(coupon._id, {
    $inc: {
      usedCount: 1,
    },
  });

  return usage;
}
