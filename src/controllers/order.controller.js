import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Batch from "../models/Batch.js";
import LiveCourse from "../models/LiveCourse.js";
import ProductAccess from "../models/ProductAccess.js";
import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import Cart from "../models/Cart.js";

import { validateAndCalculateCoupon } from "../services/coupon.service.js";

function generateOrderNumber() {
  return `LC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function hasUsableAccess(record) {
  if (!record || record.status !== "active") {
    return false;
  }

  if (!record.expiresAt) {
    return true;
  }

  return new Date(record.expiresAt) > new Date();
}

async function ensureProductNotAlreadyOwned({ userId, product, batch = null }) {
  // Recorded course
  if (product.type === "recorded_course") {
    const course = await Course.findOne({
      product: product._id,
    })
      .select("_id")
      .lean();

    if (!course) {
      throw new ApiError(
        404,
        "COURSE_NOT_FOUND",
        "Recorded course configuration not found.",
      );
    }

    const existingEnrollment = await Enrollment.findOne({
      user: userId,
      course: course._id,
      status: "active",
    })
      .select("status accessType expiresAt")
      .lean();

    if (hasUsableAccess(existingEnrollment)) {
      throw new ApiError(
        409,
        "COURSE_ALREADY_ENROLLED",
        "You are already enrolled in this course.",
      );
    }

    return;
  }

  // ProductAccess based products
  const supportedAccessTypes = [
    "live_course",
    "ebook",
    "digital_product",
    "workshop",
  ];

  if (!supportedAccessTypes.includes(product.type)) {
    return;
  }

  const accessFilter = {
    user: userId,
    product: product._id,
    status: "active",
  };

  // Live course একই batch ধরে check হবে
  if (product.type === "live_course") {
    accessFilter.batch = batch?._id;
  } else {
    accessFilter.batch = { $exists: false };
  }

  const existingAccess = await ProductAccess.findOne(accessFilter)
    .select("status accessType expiresAt batch")
    .lean();

  if (!hasUsableAccess(existingAccess)) {
    return;
  }

  if (product.type === "live_course") {
    throw new ApiError(
      409,
      "LIVE_BATCH_ALREADY_ENROLLED",
      "You are already enrolled in this live course batch.",
    );
  }

  throw new ApiError(
    409,
    "PRODUCT_ALREADY_OWNED",
    "You already have access to this product.",
  );
}

async function buildAndCreateOrder({ user, items, billing, couponCode }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(
      400,
      "ORDER_ITEMS_REQUIRED",
      "At least one product is required.",
    );
  }

  const orderItems = [];
  const seenItems = new Set();

  let subtotal = 0;

  for (const item of items) {
    const product = await Product.findOne({
      _id: item.productId,
      status: "published",
      deletedAt: null,
    }).lean();

    if (!product) {
      throw new ApiError(
        404,
        "PRODUCT_NOT_FOUND",
        "One or more products were not found.",
      );
    }

    let batchId;
    let validatedBatch = null;

    if (product.type === "live_course") {
      if (!item.batchId) {
        throw new ApiError(
          400,
          "BATCH_REQUIRED",
          "A batch must be selected for a live course.",
        );
      }

      const liveCourse = await LiveCourse.findOne({
        product: product._id,
      }).lean();

      if (!liveCourse) {
        throw new ApiError(
          404,
          "LIVE_COURSE_NOT_FOUND",
          "Live course configuration not found.",
        );
      }

      const batch = await Batch.findOne({
        _id: item.batchId,
        liveCourse: liveCourse._id,
      }).lean();

      if (!batch) {
        throw new ApiError(
          404,
          "BATCH_NOT_FOUND",
          "Selected batch does not belong to this live course.",
        );
      }

      if (batch.status === "cancelled" || batch.status === "completed") {
        throw new ApiError(
          400,
          "BATCH_NOT_AVAILABLE",
          "This batch is not available for enrollment.",
        );
      }

      const now = new Date();

      if (batch.enrollmentOpen && now < new Date(batch.enrollmentOpen)) {
        throw new ApiError(
          400,
          "ENROLLMENT_NOT_OPEN",
          "Enrollment for this batch has not opened yet.",
        );
      }

      if (batch.enrollmentClose && now > new Date(batch.enrollmentClose)) {
        throw new ApiError(
          400,
          "ENROLLMENT_CLOSED",
          "Enrollment for this batch is closed.",
        );
      }

      if (batch.capacity) {
        const enrolledCount = await ProductAccess.countDocuments({
          product: product._id,
          batch: batch._id,
          status: "active",
          $or: [
            { expiresAt: null },
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: now } },
          ],
        });

        if (enrolledCount >= batch.capacity) {
          throw new ApiError(400, "BATCH_FULL", "This batch is already full.");
        }
      }

      batchId = batch._id;
      validatedBatch = batch;
    } else if (item.batchId) {
      throw new ApiError(
        400,
        "BATCH_NOT_ALLOWED",
        "Batch can only be selected for a live course.",
      );
    }

    // Same order-এর মধ্যে duplicate product block
    const itemKey =
      product.type === "live_course"
        ? `${product._id}:${String(batchId)}`
        : String(product._id);

    if (seenItems.has(itemKey)) {
      throw new ApiError(
        409,
        "DUPLICATE_ORDER_ITEM",
        "The same product cannot be added to an order more than once.",
      );
    }

    seenItems.add(itemKey);

    // Already owned/enrolled check
    await ensureProductNotAlreadyOwned({
      userId: user._id,
      product,
      batch: validatedBatch,
    });

    const price =
      product.salePrice !== undefined && product.salePrice !== null
        ? product.salePrice
        : product.regularPrice;

    const lineTotal = Number(price);

    subtotal += lineTotal;

    orderItems.push({
      product: product._id,
      productType: product.type,
      title: product.title,
      regularPrice: product.regularPrice,
      salePrice: product.salePrice,
      quantity: 1,
      lineTotal,
      batch: batchId,
    });
  }

  let couponData;
  let total = subtotal;

  if (couponCode && String(couponCode).trim()) {
    const couponResult = await validateAndCalculateCoupon({
      code: couponCode,
      userId: user._id,
      items: orderItems,
      subtotal,
    });

    couponData = {
      code: couponResult.coupon.code,
      discountAmount: couponResult.discountAmount,
    };

    total = couponResult.total;
  }

  return Order.create({
    orderNumber: generateOrderNumber(),

    user: user._id,

    items: orderItems,

    billing: {
      name: billing?.name || user.name,
      email: billing?.email || user.email,
      phone: billing?.phone || user.phone,
    },

    subtotal,

    coupon: couponData || undefined,

    total,

    currency: "BDT",

    status: "pending",

    paymentStatus: "unpaid",
  });
}

export const createOrder = asyncHandler(async (req, res) => {
  const order = await buildAndCreateOrder({
    user: req.user,
    items: req.body.items,
    billing: req.body.billing,
    couponCode: req.body.couponCode,
  });

  res.status(201).json({
    success: true,
    message: "Order created successfully.",
    data: order,
  });
});

export const createOrderFromCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({
    user: req.user._id,
  }).lean();

  if (!cart || !cart.items?.length) {
    throw new ApiError(400, "CART_EMPTY", "Your cart is empty.");
  }

  const items = cart.items.map((item) => ({
    productId: item.product,
    batchId: item.batch || undefined,
  }));

  const order = await buildAndCreateOrder({
    user: req.user,
    items,
    billing: req.body.billing,
    couponCode: req.body.couponCode,
  });

  res.status(201).json({
    success: true,
    message: "Order created from cart successfully.",
    data: order,
  });
});
