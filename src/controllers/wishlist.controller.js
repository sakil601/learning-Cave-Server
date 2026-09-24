import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

export const getMyWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.find({
    user: req.user._id,
  })
    .populate({
      path: "product",
      match: {
        status: "published",
        deletedAt: null,
      },
      select:
        "title slug type shortDescription thumbnail regularPrice salePrice isFree status",
    })
    .sort({
      createdAt: -1,
    })
    .lean();

  const data = wishlist
    .filter((item) => item.product)
    .map((item) => ({
      _id: item._id,
      product: item.product,
      addedAt: item.createdAt,
    }));

  res.json({
    success: true,
    data,
  });
});

export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

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

  const existing = await Wishlist.findOne({
    user: req.user._id,
    product: product._id,
  });

  if (existing) {
    throw new ApiError(
      409,
      "PRODUCT_ALREADY_IN_WISHLIST",
      "This product is already in your wishlist.",
    );
  }

  const wishlist = await Wishlist.create({
    user: req.user._id,
    product: product._id,
  });

  res.status(201).json({
    success: true,
    message: "Product added to wishlist.",
    data: wishlist,
  });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const item = await Wishlist.findOneAndDelete({
    user: req.user._id,
    product: productId,
  });

  if (!item) {
    throw new ApiError(
      404,
      "WISHLIST_ITEM_NOT_FOUND",
      "Product was not found in your wishlist.",
    );
  }

  res.json({
    success: true,
    message: "Product removed from wishlist.",
  });
});

export const clearWishlist = asyncHandler(async (req, res) => {
  await Wishlist.deleteMany({
    user: req.user._id,
  });

  res.json({
    success: true,
    message: "Wishlist cleared successfully.",
  });
});
