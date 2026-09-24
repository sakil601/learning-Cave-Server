import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import Batch from "../models/Batch.js";
import LiveCourse from "../models/LiveCourse.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

export const getMyCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({
    user: req.user._id,
  })
    .populate({
      path: "items.product",
      select:
        "title slug type shortDescription thumbnail regularPrice salePrice isFree status",
    })
    .populate({
      path: "items.batch",
      select:
        "name startDate endDate status capacity enrollmentOpen enrollmentClose",
    })
    .lean();

  if (!cart) {
    return res.json({
      success: true,
      data: {
        items: [],
        subtotal: 0,
      },
    });
  }

  const validItems = cart.items.filter(
    (item) => item.product && item.product.status === "published",
  );

  const items = validItems.map((item) => {
    const product = item.product;

    const price =
      product.salePrice !== undefined && product.salePrice !== null
        ? product.salePrice
        : product.regularPrice;

    return {
      _id: item._id,
      product,
      batch: item.batch || null,
      price,
      addedAt: item.addedAt,
    };
  });

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0),
    0,
  );

  res.json({
    success: true,
    data: {
      items,
      subtotal,
    },
  });
});

export const addToCart = asyncHandler(async (req, res) => {
  const { productId, batchId } = req.body;

  if (!productId) {
    throw new ApiError(400, "PRODUCT_REQUIRED", "Product is required.");
  }

  const product = await Product.findOne({
    _id: productId,
    status: "published",
    deletedAt: null,
  }).lean();

  if (!product) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }

  let validatedBatch = null;

  if (product.type === "live_course") {
    if (!batchId) {
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

    validatedBatch = await Batch.findOne({
      _id: batchId,
      liveCourse: liveCourse._id,
    }).lean();

    if (!validatedBatch) {
      throw new ApiError(
        404,
        "BATCH_NOT_FOUND",
        "Selected batch does not belong to this live course.",
      );
    }

    if (
      validatedBatch.status === "cancelled" ||
      validatedBatch.status === "completed"
    ) {
      throw new ApiError(
        400,
        "BATCH_NOT_AVAILABLE",
        "This batch is not available.",
      );
    }

    const now = new Date();

    if (
      validatedBatch.enrollmentOpen &&
      now < new Date(validatedBatch.enrollmentOpen)
    ) {
      throw new ApiError(
        400,
        "ENROLLMENT_NOT_OPEN",
        "Enrollment has not opened yet.",
      );
    }

    if (
      validatedBatch.enrollmentClose &&
      now > new Date(validatedBatch.enrollmentClose)
    ) {
      throw new ApiError(400, "ENROLLMENT_CLOSED", "Enrollment is closed.");
    }
  } else if (batchId) {
    throw new ApiError(
      400,
      "BATCH_NOT_ALLOWED",
      "Batch can only be selected for a live course.",
    );
  }

  let cart = await Cart.findOne({
    user: req.user._id,
  });

  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [],
    });
  }

  const duplicate = cart.items.find((item) => {
    const sameProduct = String(item.product) === String(product._id);

    const sameBatch =
      String(item.batch || "") === String(validatedBatch?._id || "");

    return sameProduct && sameBatch;
  });

  if (duplicate) {
    throw new ApiError(
      409,
      "PRODUCT_ALREADY_IN_CART",
      "This product is already in your cart.",
    );
  }

  cart.items.push({
    product: product._id,
    batch: validatedBatch?._id || undefined,
  });

  await cart.save();

  res.status(201).json({
    success: true,
    message: "Product added to cart successfully.",
    data: cart,
  });
});

export const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({
    user: req.user._id,
  });

  if (!cart) {
    throw new ApiError(404, "CART_NOT_FOUND", "Cart not found.");
  }

  const itemExists = cart.items.some(
    (item) => String(item._id) === String(itemId),
  );

  if (!itemExists) {
    throw new ApiError(404, "CART_ITEM_NOT_FOUND", "Cart item not found.");
  }

  cart.items = cart.items.filter((item) => String(item._id) !== String(itemId));

  await cart.save();

  res.json({
    success: true,
    message: "Cart item removed successfully.",
    data: cart,
  });
});

export const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({
    user: req.user._id,
  });

  if (!cart) {
    return res.json({
      success: true,
      message: "Cart is already empty.",
      data: {
        items: [],
      },
    });
  }

  cart.items = [];

  await cart.save();

  res.json({
    success: true,
    message: "Cart cleared successfully.",
    data: cart,
  });
});
