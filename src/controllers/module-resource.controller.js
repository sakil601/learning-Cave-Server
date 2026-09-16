import ModuleResource from "../models/ModuleResource.js";
import Module from "../models/Module.js";
import Enrollment from "../models/Enrollment.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

export const createModuleResource = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;

  const {
    title,
    type,
    url,
    fileName,
    order = 0,
    downloadable = true,
    active = true,
  } = req.body;

  const module = await Module.findById(moduleId).lean();

  if (!module) {
    throw new ApiError(404, "MODULE_NOT_FOUND", "Module not found.");
  }

  const resource = await ModuleResource.create({
    module: moduleId,
    title,
    type,
    url,
    fileName,
    order,
    downloadable,
    active,
  });

  res.status(201).json({
    success: true,
    message: "Module resource created successfully.",
    data: resource,
  });
});

export const updateModuleResource = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;

  const allowedFields = [
    "title",
    "type",
    "url",
    "fileName",
    "order",
    "downloadable",
    "active",
  ];

  const update = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      update[field] = req.body[field];
    }
  }

  const resource = await ModuleResource.findByIdAndUpdate(resourceId, update, {
    new: true,
    runValidators: true,
  });

  if (!resource) {
    throw new ApiError(
      404,
      "MODULE_RESOURCE_NOT_FOUND",
      "Module resource not found.",
    );
  }

  res.json({
    success: true,
    message: "Module resource updated successfully.",
    data: resource,
  });
});

export const deleteModuleResource = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;

  const resource = await ModuleResource.findByIdAndDelete(resourceId);

  if (!resource) {
    throw new ApiError(
      404,
      "MODULE_RESOURCE_NOT_FOUND",
      "Module resource not found.",
    );
  }

  res.json({
    success: true,
    message: "Module resource deleted successfully.",
  });
});

export const getModuleResourcesForAdmin = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;

  const resources = await ModuleResource.find({
    module: moduleId,
  })
    .sort({
      order: 1,
      createdAt: 1,
    })
    .lean();

  res.json({
    success: true,
    data: resources,
  });
});

export const getStudentModuleResources = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;

  const module = await Module.findById(moduleId).lean();

  if (!module) {
    throw new ApiError(404, "MODULE_NOT_FOUND", "Module not found.");
  }

  const enrollment = await Enrollment.findOne({
    user: req.user._id,
    course: module.course,
    status: "active",
  }).lean();

  if (!enrollment) {
    throw new ApiError(
      403,
      "COURSE_ACCESS_DENIED",
      "You do not have access to this course.",
    );
  }

  if (enrollment.expiresAt && new Date(enrollment.expiresAt) < new Date()) {
    throw new ApiError(
      403,
      "COURSE_ACCESS_EXPIRED",
      "Your course access has expired.",
    );
  }

  const resources = await ModuleResource.find({
    module: moduleId,
    active: true,
  })
    .select("title type url fileName order downloadable")
    .sort({
      order: 1,
      createdAt: 1,
    })
    .lean();

  res.json({
    success: true,
    data: resources,
  });
});
