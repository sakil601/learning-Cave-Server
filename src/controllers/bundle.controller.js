import Product from "../models/Product.js";
import Bundle from "../models/Bundle.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

async function validateBundleItems(productIds = [], bundleProductId = null) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw new ApiError(
      400,
      "BUNDLE_ITEMS_REQUIRED",
      "At least one product is required in the bundle.",
    );
  }

  const uniqueIds = [...new Set(productIds.map(String))];

  if (bundleProductId && uniqueIds.includes(String(bundleProductId))) {
    throw new ApiError(
      400,
      "BUNDLE_CANNOT_INCLUDE_ITSELF",
      "A bundle cannot include itself.",
    );
  }

  const products = await Product.find({
    _id: {
      $in: uniqueIds,
    },
    deletedAt: null,
  })
    .select("_id type status")
    .lean();

  if (products.length !== uniqueIds.length) {
    throw new ApiError(
      400,
      "INVALID_BUNDLE_ITEM",
      "One or more bundle products were not found.",
    );
  }

  const nestedBundle = products.find((product) => product.type === "bundle");

  if (nestedBundle) {
    throw new ApiError(
      400,
      "NESTED_BUNDLE_NOT_ALLOWED",
      "A bundle cannot contain another bundle.",
    );
  }

  return products;
}

export const createBundle = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const { items = [], includeFutureItems = false, futureItemRules } = req.body;

  const product = await Product.findOne({
    _id: productId,
    type: "bundle",
    deletedAt: null,
  });

  if (!product) {
    throw new ApiError(
      404,
      "BUNDLE_PRODUCT_NOT_FOUND",
      "Bundle product not found.",
    );
  }

  const existing = await Bundle.findOne({
    product: product._id,
  });

  if (existing) {
    throw new ApiError(
      409,
      "BUNDLE_ALREADY_EXISTS",
      "Bundle configuration already exists.",
    );
  }

  const productIds = items.map((item) => item.product);

  await validateBundleItems(productIds, product._id);

  const bundle = await Bundle.create({
    product: product._id,

    items: productIds.map((id) => ({
      product: id,
    })),

    includeFutureItems,

    futureItemRules: includeFutureItems ? futureItemRules : undefined,
  });

  res.status(201).json({
    success: true,
    message: "Bundle created successfully.",
    data: bundle,
  });
});

export const getManagedBundle = asyncHandler(async (req, res) => {
  const bundle = await Bundle.findOne({
    product: req.params.productId,
  })
    .populate({
      path: "product",
      select: "title slug type status regularPrice salePrice access",
    })
    .populate({
      path: "items.product",
      select: "title slug type status regularPrice salePrice thumbnail",
    })
    .lean();

  if (!bundle) {
    throw new ApiError(404, "BUNDLE_NOT_FOUND", "Bundle not found.");
  }

  res.json({
    success: true,
    data: bundle,
  });
});

export const updateBundle = asyncHandler(async (req, res) => {
  const bundle = await Bundle.findById(req.params.bundleId);

  if (!bundle) {
    throw new ApiError(404, "BUNDLE_NOT_FOUND", "Bundle not found.");
  }

  if (req.body.items !== undefined) {
    const productIds = req.body.items.map((item) => item.product);

    await validateBundleItems(productIds, bundle.product);

    bundle.items = productIds.map((id) => ({
      product: id,
    }));
  }

  if (req.body.includeFutureItems !== undefined) {
    bundle.includeFutureItems = req.body.includeFutureItems;
  }

  if (req.body.futureItemRules !== undefined) {
    bundle.futureItemRules = req.body.futureItemRules;
  }

  if (!bundle.includeFutureItems) {
    bundle.futureItemRules = undefined;
  }

  await bundle.save();

  res.json({
    success: true,
    message: "Bundle updated successfully.",
    data: bundle,
  });
});
