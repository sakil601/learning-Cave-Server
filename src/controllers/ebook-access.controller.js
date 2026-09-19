import path from "path";
import fs from "fs";

import ProductAccess from "../models/ProductAccess.js";
import Product from "../models/Product.js";
import Ebook from "../models/Ebook.js";
import Asset from "../models/Asset.js";
import DownloadHistory from "../models/DownloadHistory.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

function isExpired(access) {
  return access.expiresAt && new Date(access.expiresAt) < new Date();
}

export const getMyEbooks = asyncHandler(async (req, res) => {
  const accesses = await ProductAccess.find({
    user: req.user._id,
    status: "active",
  })
    .populate({
      path: "product",
      match: {
        type: "ebook",
        deletedAt: null,
      },
      select: "title slug shortDescription thumbnail access status",
    })
    .sort({
      createdAt: -1,
    })
    .lean();

  const data = accesses
    .filter((access) => access.product && !isExpired(access))
    .map((access) => ({
      accessId: access._id,
      product: access.product,
      accessType: access.accessType,
      startsAt: access.startsAt,
      expiresAt: access.expiresAt,
    }));

  res.json({
    success: true,
    data,
  });
});

export const getMyEbook = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const access = await ProductAccess.findOne({
    user: req.user._id,
    product: productId,
    status: "active",
  }).lean();

  if (!access) {
    throw new ApiError(
      403,
      "EBOOK_ACCESS_DENIED",
      "You do not have access to this ebook.",
    );
  }

  if (isExpired(access)) {
    throw new ApiError(
      403,
      "EBOOK_ACCESS_EXPIRED",
      "Your ebook access has expired.",
    );
  }

  const product = await Product.findOne({
    _id: productId,
    type: "ebook",
    deletedAt: null,
  }).lean();

  if (!product) {
    throw new ApiError(
      404,
      "EBOOK_PRODUCT_NOT_FOUND",
      "Ebook product not found.",
    );
  }

  const ebook = await Ebook.findOne({
    product: product._id,
  })
    .populate({
      path: "previewAsset",
      select: "fileName mimeType size",
    })
    .populate({
      path: "mainAsset",
      select: "fileName mimeType size",
    })
    .lean();

  if (!ebook) {
    throw new ApiError(404, "EBOOK_NOT_FOUND", "Ebook not found.");
  }

  res.json({
    success: true,
    data: {
      access: {
        accessType: access.accessType,
        startsAt: access.startsAt,
        expiresAt: access.expiresAt,
      },

      product: {
        _id: product._id,
        title: product.title,
        slug: product.slug,
        shortDescription: product.shortDescription,
        thumbnail: product.thumbnail,
      },

      ebook: {
        _id: ebook._id,
        author: ebook.author,
        version: ebook.version,

        previewAsset: ebook.previewAsset,

        mainAsset: ebook.mainAsset
          ? {
              _id: ebook.mainAsset._id,
              fileName: ebook.mainAsset.fileName,
              mimeType: ebook.mainAsset.mimeType,
              size: ebook.mainAsset.size,
            }
          : null,
      },
    },
  });
});

export const downloadMyEbook = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const access = await ProductAccess.findOne({
    user: req.user._id,
    product: productId,
    status: "active",
  }).lean();

  if (!access) {
    throw new ApiError(
      403,
      "EBOOK_ACCESS_DENIED",
      "You do not have access to this ebook.",
    );
  }

  if (isExpired(access)) {
    throw new ApiError(
      403,
      "EBOOK_ACCESS_EXPIRED",
      "Your ebook access has expired.",
    );
  }

  const product = await Product.findOne({
    _id: productId,
    type: "ebook",
    deletedAt: null,
  }).lean();

  if (!product) {
    throw new ApiError(
      404,
      "EBOOK_PRODUCT_NOT_FOUND",
      "Ebook product not found.",
    );
  }

  const ebook = await Ebook.findOne({
    product: product._id,
  }).lean();

  if (!ebook?.mainAsset) {
    throw new ApiError(
      404,
      "EBOOK_FILE_NOT_FOUND",
      "Ebook file is not available.",
    );
  }

  const asset = await Asset.findById(ebook.mainAsset).lean();

  if (!asset) {
    throw new ApiError(404, "ASSET_NOT_FOUND", "Ebook asset not found.");
  }

  if (asset.storageProvider !== "local") {
    throw new ApiError(
      400,
      "UNSUPPORTED_STORAGE_PROVIDER",
      "This storage provider is not supported yet.",
    );
  }

  const absolutePath = path.resolve(process.cwd(), asset.storageKey);

  if (!fs.existsSync(absolutePath)) {
    throw new ApiError(
      404,
      "FILE_NOT_FOUND",
      "Ebook file was not found on the server.",
    );
  }

  await DownloadHistory.create({
    user: req.user._id,
    product: product._id,
    asset: asset._id,
    downloadedAt: new Date(),
  });

  return res.download(absolutePath, asset.fileName);
});
