import path from "path";

import Asset from "../models/Asset.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

export const uploadEbookAsset = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "FILE_REQUIRED", "PDF file is required.");
  }

  const storageKey = path.relative(process.cwd(), req.file.path);

  const asset = await Asset.create({
    uploadedBy: req.user._id,

    fileName: req.file.originalname,

    storageKey,

    mimeType: req.file.mimetype,

    size: req.file.size,

    storageProvider: "local",

    visibility: "private",
  });

  res.status(201).json({
    success: true,

    message: "Ebook PDF uploaded successfully.",

    data: asset,
  });
});
