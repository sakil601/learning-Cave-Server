import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { slugify } from "../utils/slugify.js";

export const listCategories = asyncHandler(async (req, res) => {
  const includeInactive =
    req.user?.role === "admin" && req.query.includeInactive === "true";
  const filter = includeInactive ? {} : { active: true };
  if (req.query.parent === "root") filter.parent = null;
  else if (req.query.parent) filter.parent = req.query.parent;
  const data = await Category.find(filter)
    .populate("parent", "name slug")
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  res.json({ success: true, data });
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    slug: req.params.slug,
    active: true,
  })
    .populate("parent", "name slug")
    .lean();
  if (!category)
    throw new ApiError(404, "CATEGORY_NOT_FOUND", "Category not found.");
  res.json({ success: true, data: category });
});

export const createCategory = asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const slug = slugify(body.slug || body.name);
  if (!slug)
    throw new ApiError(
      400,
      "INVALID_SLUG",
      "A valid category slug is required.",
    );
  if (body.parent) {
    const parent = await Category.findById(body.parent);
    if (!parent)
      throw new ApiError(
        400,
        "PARENT_CATEGORY_NOT_FOUND",
        "Parent category not found.",
      );
  }
  if (await Category.exists({ slug }))
    throw new ApiError(
      409,
      "CATEGORY_SLUG_EXISTS",
      "Category slug already exists.",
    );
  const category = await Category.create({ ...body, slug });
  res
    .status(201)
    .json({
      success: true,
      message: "Category created successfully.",
      data: category,
    });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.validated.params.id);
  if (!category)
    throw new ApiError(404, "CATEGORY_NOT_FOUND", "Category not found.");
  const patch = { ...req.validated.body };
  if (patch.slug || patch.name) {
    const nextSlug = slugify(patch.slug || patch.name);
    const duplicate = await Category.exists({
      slug: nextSlug,
      _id: { $ne: category._id },
    });
    if (duplicate)
      throw new ApiError(
        409,
        "CATEGORY_SLUG_EXISTS",
        "Category slug already exists.",
      );
    patch.slug = nextSlug;
  }
  if (patch.parent) {
    if (String(patch.parent) === String(category._id))
      throw new ApiError(
        400,
        "INVALID_CATEGORY_PARENT",
        "A category cannot be its own parent.",
      );
    if (!(await Category.exists({ _id: patch.parent })))
      throw new ApiError(
        400,
        "PARENT_CATEGORY_NOT_FOUND",
        "Parent category not found.",
      );
  }
  Object.assign(category, patch);
  await category.save();
  res.json({
    success: true,
    message: "Category updated successfully.",
    data: category,
  });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.validated.params.id);
  if (!category)
    throw new ApiError(404, "CATEGORY_NOT_FOUND", "Category not found.");
  const hasChildren = await Category.exists({ parent: category._id });
  if (hasChildren)
    throw new ApiError(
      409,
      "CATEGORY_HAS_CHILDREN",
      "Move or remove child categories first.",
    );
  const usedByProduct = await Product.exists({
    categories: category._id,
    deletedAt: null,
  });
  if (usedByProduct)
    throw new ApiError(
      409,
      "CATEGORY_IN_USE",
      "Category is used by one or more products.",
    );
  await category.deleteOne();
  res.json({ success: true, message: "Category deleted successfully." });
});
