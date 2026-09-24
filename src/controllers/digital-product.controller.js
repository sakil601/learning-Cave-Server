import Product from "../models/Product.js";
import DigitalProduct from "../models/DigitalProduct.js";
import Asset from "../models/Asset.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

export const createDigitalProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const { files = [], existingBuyersCanAccessUpdate = true } = req.body;

  const product = await Product.findOne({
    _id: productId,
    type: "digital_product",
    deletedAt: null,
  });

  if (!product) {
    throw new ApiError(
      404,
      "DIGITAL_PRODUCT_NOT_FOUND",
      "Digital product was not found.",
    );
  }

  const existing = await DigitalProduct.findOne({
    product: product._id,
  });

  if (existing) {
    throw new ApiError(
      409,
      "DIGITAL_PRODUCT_ALREADY_EXISTS",
      "Digital product configuration already exists.",
    );
  }

  if (!Array.isArray(files) || files.length === 0) {
    throw new ApiError(
      400,
      "DIGITAL_PRODUCT_FILES_REQUIRED",
      "At least one file is required.",
    );
  }

  const assetIds = files.map((file) => file.asset).filter(Boolean);

  const assets = await Asset.find({
    _id: {
      $in: assetIds,
    },
  })
    .select("_id")
    .lean();

  if (assets.length !== new Set(assetIds.map(String)).size) {
    throw new ApiError(
      400,
      "INVALID_DIGITAL_PRODUCT_ASSET",
      "One or more assets were not found.",
    );
  }

  const digitalProduct = await DigitalProduct.create({
    product: product._id,

    files: files.map((file) => ({
      asset: file.asset,
      title: file.title,
      version: file.version,
    })),

    existingBuyersCanAccessUpdate,
  });

  res.status(201).json({
    success: true,
    message: "Digital product created successfully.",
    data: digitalProduct,
  });
});

export const getManagedDigitalProduct = asyncHandler(async (req, res) => {
  const digitalProduct = await DigitalProduct.findOne({
    product: req.params.productId,
  })
    .populate({
      path: "product",
      select: "title slug type status regularPrice salePrice access",
    })
    .populate({
      path: "files.asset",
      select: "fileName mimeType size storageProvider visibility",
    })
    .lean();

  if (!digitalProduct) {
    throw new ApiError(
      404,
      "DIGITAL_PRODUCT_NOT_FOUND",
      "Digital product configuration not found.",
    );
  }

  res.json({
    success: true,
    data: digitalProduct,
  });
});

export const updateDigitalProduct = asyncHandler(async (req, res) => {
  const digitalProduct = await DigitalProduct.findById(
    req.params.digitalProductId,
  );

  if (!digitalProduct) {
    throw new ApiError(
      404,
      "DIGITAL_PRODUCT_NOT_FOUND",
      "Digital product configuration not found.",
    );
  }

  if (req.body.files !== undefined) {
    if (!Array.isArray(req.body.files) || req.body.files.length === 0) {
      throw new ApiError(
        400,
        "DIGITAL_PRODUCT_FILES_REQUIRED",
        "At least one file is required.",
      );
    }

    const assetIds = req.body.files.map((file) => file.asset).filter(Boolean);

    const assets = await Asset.find({
      _id: {
        $in: assetIds,
      },
    })
      .select("_id")
      .lean();

    if (assets.length !== new Set(assetIds.map(String)).size) {
      throw new ApiError(
        400,
        "INVALID_DIGITAL_PRODUCT_ASSET",
        "One or more assets were not found.",
      );
    }

    digitalProduct.files = req.body.files;
  }

  if (req.body.existingBuyersCanAccessUpdate !== undefined) {
    digitalProduct.existingBuyersCanAccessUpdate =
      req.body.existingBuyersCanAccessUpdate;
  }

  await digitalProduct.save();

  res.json({
    success: true,
    message: "Digital product updated successfully.",
    data: digitalProduct,
  });
});
