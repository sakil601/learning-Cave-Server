import Coupon from "../models/Coupon.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

import { validateAndCalculateCoupon } from "../services/coupon.service.js";

export const createCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    type,
    value,
    minOrderAmount = 0,
    maxDiscountAmount,
    appliesTo = "all",
    products = [],
    startsAt,
    expiresAt,
    usageLimit,
    perUserLimit = 1,
    active = true,
  } = req.body;

  const normalizedCode = String(code || "")
    .trim()
    .toUpperCase();

  if (!normalizedCode) {
    throw new ApiError(400, "COUPON_CODE_REQUIRED", "Coupon code is required.");
  }

  const existing = await Coupon.findOne({
    code: normalizedCode,
  }).lean();

  if (existing) {
    throw new ApiError(
      400,
      "COUPON_ALREADY_EXISTS",
      "Coupon code already exists.",
    );
  }

  if (!["percentage", "fixed"].includes(type)) {
    throw new ApiError(
      400,
      "INVALID_COUPON_TYPE",
      "Coupon type must be percentage or fixed.",
    );
  }

  if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
    throw new ApiError(
      400,
      "INVALID_COUPON_VALUE",
      "Coupon value must be greater than 0.",
    );
  }

  if (type === "percentage" && Number(value) > 100) {
    throw new ApiError(
      400,
      "INVALID_PERCENTAGE",
      "Percentage discount cannot exceed 100.",
    );
  }

  if (
    appliesTo === "selected_products" &&
    (!Array.isArray(products) || products.length === 0)
  ) {
    throw new ApiError(
      400,
      "COUPON_PRODUCTS_REQUIRED",
      "Select at least one product.",
    );
  }

  if (startsAt && expiresAt && new Date(startsAt) >= new Date(expiresAt)) {
    throw new ApiError(
      400,
      "INVALID_COUPON_DATES",
      "Coupon expiry must be after start date.",
    );
  }

  const coupon = await Coupon.create({
    code: normalizedCode,
    type,
    value: Number(value),
    minOrderAmount: Number(minOrderAmount) || 0,
    maxDiscountAmount:
      maxDiscountAmount !== undefined ? Number(maxDiscountAmount) : undefined,
    appliesTo,
    products: appliesTo === "selected_products" ? products : [],
    startsAt: startsAt || undefined,
    expiresAt: expiresAt || undefined,
    usageLimit: usageLimit !== undefined ? Number(usageLimit) : undefined,
    perUserLimit: Number(perUserLimit) || 1,
    active,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Coupon created successfully.",
    data: coupon,
  });
});

export const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find()
    .populate({
      path: "products",
      select: "title slug",
    })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: coupons,
  });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const coupon = await Coupon.findById(id);

  if (!coupon) {
    throw new ApiError(404, "COUPON_NOT_FOUND", "Coupon not found.");
  }

  const allowedFields = [
    "type",
    "value",
    "minOrderAmount",
    "maxDiscountAmount",
    "appliesTo",
    "products",
    "startsAt",
    "expiresAt",
    "usageLimit",
    "perUserLimit",
    "active",
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      coupon[field] = req.body[field];
    }
  }

  if (coupon.type === "percentage" && Number(coupon.value) > 100) {
    throw new ApiError(
      400,
      "INVALID_PERCENTAGE",
      "Percentage discount cannot exceed 100.",
    );
  }

  if (
    coupon.appliesTo === "selected_products" &&
    (!Array.isArray(coupon.products) || coupon.products.length === 0)
  ) {
    throw new ApiError(
      400,
      "COUPON_PRODUCTS_REQUIRED",
      "Select at least one product.",
    );
  }

  if (coupon.appliesTo === "all") {
    coupon.products = [];
  }

  if (
    coupon.startsAt &&
    coupon.expiresAt &&
    new Date(coupon.startsAt) >= new Date(coupon.expiresAt)
  ) {
    throw new ApiError(
      400,
      "INVALID_COUPON_DATES",
      "Coupon expiry must be after start date.",
    );
  }

  await coupon.save();

  res.json({
    success: true,
    message: "Coupon updated successfully.",
    data: coupon,
  });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const coupon = await Coupon.findByIdAndDelete(id);

  if (!coupon) {
    throw new ApiError(404, "COUPON_NOT_FOUND", "Coupon not found.");
  }

  res.json({
    success: true,
    message: "Coupon deleted successfully.",
  });
});

export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, items, subtotal } = req.body;

  const result = await validateAndCalculateCoupon({
    code,
    userId: req.user._id,
    items,
    subtotal,
  });

  res.json({
    success: true,
    message: "Coupon applied successfully.",
    data: result,
  });
});
