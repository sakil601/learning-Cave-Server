import path from "path";
import fs from "fs";

import ProductAccess from "../models/ProductAccess.js";
import Product from "../models/Product.js";
import DigitalProduct from "../models/DigitalProduct.js";
import Asset from "../models/Asset.js";
import DownloadHistory from "../models/DownloadHistory.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

function isExpired(access) {
  return access.expiresAt && new Date(access.expiresAt) < new Date();
}

export const getMyDigitalProducts = asyncHandler(async (req, res) => {
  const accesses = await ProductAccess.find({
    user: req.user._id,
    status: "active",
  })
    .populate({
      path: "product",
      match: {
        type: "digital_product",
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

export const getMyDigitalProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const access = await ProductAccess.findOne({
    user: req.user._id,
    product: productId,
    status: "active",
  }).lean();

  if (!access) {
    throw new ApiError(
      403,
      "DIGITAL_PRODUCT_ACCESS_DENIED",
      "You do not have access to this digital product.",
    );
  }

  if (isExpired(access)) {
    throw new ApiError(
      403,
      "DIGITAL_PRODUCT_ACCESS_EXPIRED",
      "Your digital product access has expired.",
    );
  }

  const product = await Product.findOne({
    _id: productId,
    type: "digital_product",
    deletedAt: null,
  }).lean();

  if (!product) {
    throw new ApiError(
      404,
      "DIGITAL_PRODUCT_NOT_FOUND",
      "Digital product not found.",
    );
  }

  const digitalProduct = await DigitalProduct.findOne({
    product: product._id,
  })
    .populate({
      path: "files.asset",
      select: "fileName mimeType size storageProvider",
    })
    .lean();

  if (!digitalProduct) {
    throw new ApiError(
      404,
      "DIGITAL_PRODUCT_CONFIG_NOT_FOUND",
      "Digital product configuration not found.",
    );
  }

  const files = digitalProduct.files.map((file) => ({
    assetId: file.asset?._id,
    title: file.title,
    version: file.version,
    fileName: file.asset?.fileName,
    mimeType: file.asset?.mimeType,
    size: file.asset?.size,
  }));

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

      digitalProduct: {
        _id: digitalProduct._id,

        existingBuyersCanAccessUpdate:
          digitalProduct.existingBuyersCanAccessUpdate,

        files,
      },
    },
  });
});

export const downloadDigitalProductFile = asyncHandler(async (req, res) => {
  const { productId, assetId } = req.params;

  const access = await ProductAccess.findOne({
    user: req.user._id,
    product: productId,
    status: "active",
  }).lean();

  if (!access) {
    throw new ApiError(
      403,
      "DIGITAL_PRODUCT_ACCESS_DENIED",
      "You do not have access to this digital product.",
    );
  }

  if (isExpired(access)) {
    throw new ApiError(
      403,
      "DIGITAL_PRODUCT_ACCESS_EXPIRED",
      "Your digital product access has expired.",
    );
  }

  const product = await Product.findOne({
    _id: productId,
    type: "digital_product",
    deletedAt: null,
  }).lean();

  if (!product) {
    throw new ApiError(
      404,
      "DIGITAL_PRODUCT_NOT_FOUND",
      "Digital product not found.",
    );
  }

  const digitalProduct = await DigitalProduct.findOne({
    product: product._id,
    "files.asset": assetId,
  }).lean();

  if (!digitalProduct) {
    throw new ApiError(
      404,
      "DIGITAL_PRODUCT_FILE_NOT_FOUND",
      "This file does not belong to the digital product.",
    );
  }

  const asset = await Asset.findById(assetId).lean();

  if (!asset) {
    throw new ApiError(
      404,
      "ASSET_NOT_FOUND",
      "Digital product asset not found.",
    );
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
      "Digital product file was not found on the server.",
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
