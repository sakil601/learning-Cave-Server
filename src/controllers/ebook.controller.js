import Product from "../models/Product.js";
import Ebook from "../models/Ebook.js";
import Asset from "../models/Asset.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

export const createEbook = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const {
    author,
    previewAsset,
    mainAsset,
    version = "1.0",
    existingBuyersCanAccessUpdate = true,
  } = req.body;

  const product = await Product.findOne({
    _id: productId,
    type: "ebook",
    deletedAt: null,
  });

  if (!product) {
    throw new ApiError(
      404,
      "EBOOK_PRODUCT_NOT_FOUND",
      "Ebook product not found.",
    );
  }

  const existing = await Ebook.findOne({
    product: product._id,
  });

  if (existing) {
    throw new ApiError(
      409,
      "EBOOK_ALREADY_EXISTS",
      "Ebook already exists for this product.",
    );
  }

  if (previewAsset) {
    const previewExists = await Asset.exists({
      _id: previewAsset,
    });

    if (!previewExists) {
      throw new ApiError(
        400,
        "INVALID_PREVIEW_ASSET",
        "Preview asset not found.",
      );
    }
  }

  if (mainAsset) {
    const mainExists = await Asset.exists({
      _id: mainAsset,
    });

    if (!mainExists) {
      throw new ApiError(400, "INVALID_MAIN_ASSET", "Main asset not found.");
    }
  }

  const ebook = await Ebook.create({
    product: product._id,
    author,
    previewAsset,
    mainAsset,
    version,
    existingBuyersCanAccessUpdate,
  });

  res.status(201).json({
    success: true,
    message: "Ebook created successfully.",
    data: ebook,
  });
});

export const updateEbook = asyncHandler(async (req, res) => {
  const { ebookId } = req.params;

  const ebook = await Ebook.findById(ebookId);

  if (!ebook) {
    throw new ApiError(404, "EBOOK_NOT_FOUND", "Ebook not found.");
  }

  const allowedFields = [
    "author",
    "previewAsset",
    "mainAsset",
    "version",
    "existingBuyersCanAccessUpdate",
  ];

  if (req.body.previewAsset) {
    const exists = await Asset.exists({
      _id: req.body.previewAsset,
    });

    if (!exists) {
      throw new ApiError(
        400,
        "INVALID_PREVIEW_ASSET",
        "Preview asset not found.",
      );
    }
  }

  if (req.body.mainAsset) {
    const exists = await Asset.exists({
      _id: req.body.mainAsset,
    });

    if (!exists) {
      throw new ApiError(400, "INVALID_MAIN_ASSET", "Main asset not found.");
    }
  }

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      ebook[field] = req.body[field];
    }
  }

  await ebook.save();

  res.json({
    success: true,
    message: "Ebook updated successfully.",
    data: ebook,
  });
});

export const getManagedEbook = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const ebook = await Ebook.findOne({
    product: productId,
  })
    .populate({
      path: "product",
      select: "title slug type status regularPrice salePrice access",
    })
    .populate({
      path: "previewAsset",
      select: "fileName mimeType size storageProvider visibility",
    })
    .populate({
      path: "mainAsset",
      select: "fileName mimeType size storageProvider visibility",
    })
    .lean();

  if (!ebook) {
    throw new ApiError(404, "EBOOK_NOT_FOUND", "Ebook not found.");
  }

  res.json({
    success: true,
    data: ebook,
  });
});
