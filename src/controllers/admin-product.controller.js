import Product from "../models/Product.js";
import Category from "../models/Category.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { slugify } from "../utils/slugify.js";

const allowedTypes = [
  "live_course",
  "workshop",
  "ebook",
  "digital_product",
  "bundle",
];

async function validateCategories(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return;
  }

  const uniqueIds = [...new Set(ids.map(String))];

  const count = await Category.countDocuments({
    _id: {
      $in: uniqueIds,
    },
    active: true,
  });

  if (count !== uniqueIds.length) {
    throw new ApiError(
      400,
      "INVALID_CATEGORY",
      "One or more categories are invalid or inactive.",
    );
  }
}

export const createAdminProduct = asyncHandler(async (req, res) => {
  const {
    type,
    title,
    slug,
    shortDescription,
    description,
    thumbnail,
    gallery = [],
    categories = [],
    tags = [],
    regularPrice = 0,
    salePrice,
    isFree = false,
    access,
    seo,
  } = req.body;

  if (!allowedTypes.includes(type)) {
    throw new ApiError(
      400,
      "INVALID_PRODUCT_TYPE",
      "Product type must be live_course, workshop, ebook, digital_product, or bundle.",
    );
  }

  if (!title || !String(title).trim()) {
    throw new ApiError(
      400,
      "PRODUCT_TITLE_REQUIRED",
      "Product title is required.",
    );
  }

  await validateCategories(categories);

  const finalSlug = slugify(slug || title);

  if (!finalSlug) {
    throw new ApiError(
      400,
      "INVALID_SLUG",
      "A valid product slug is required.",
    );
  }

  const existing = await Product.exists({
    slug: finalSlug,
  });

  if (existing) {
    throw new ApiError(
      409,
      "PRODUCT_SLUG_EXISTS",
      "Product slug already exists.",
    );
  }

  let finalRegularPrice = Number(regularPrice) || 0;

  let finalSalePrice =
    salePrice !== undefined && salePrice !== null
      ? Number(salePrice)
      : undefined;

  if (isFree) {
    finalRegularPrice = 0;
    finalSalePrice = undefined;
  }

  if (finalSalePrice !== undefined && finalSalePrice < 0) {
    throw new ApiError(
      400,
      "INVALID_SALE_PRICE",
      "Sale price cannot be negative.",
    );
  }

  if (finalRegularPrice < 0) {
    throw new ApiError(
      400,
      "INVALID_REGULAR_PRICE",
      "Regular price cannot be negative.",
    );
  }

  const product = await Product.create({
    type,

    title: String(title).trim(),

    slug: finalSlug,

    shortDescription,

    description,

    thumbnail,

    gallery,

    categories,

    tags,

    regularPrice: finalRegularPrice,

    salePrice: finalSalePrice,

    isFree,

    access,

    seo,

    // সব generic product প্রথমে draft
    status: "draft",

    createdBy: req.user._id,

    updatedBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Product created successfully.",
    data: product,
  });
});

export const listAdminProducts = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);

  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);

  const filter = {
    deletedAt: null,
  };

  if (req.query.type) {
    filter.type = req.query.type;
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.search) {
    filter.$or = [
      {
        title: {
          $regex: req.query.search,
          $options: "i",
        },
      },
      {
        slug: {
          $regex: req.query.search,
          $options: "i",
        },
      },
    ];
  }

  const [data, total] = await Promise.all([
    Product.find(filter)
      .populate("categories", "name slug")
      .sort({
        createdAt: -1,
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const updateAdminProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findOne({
    _id: id,
    deletedAt: null,
  });

  if (!product) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }

  // Recorded course edit existing
  // course flow দিয়েই হবে
  if (product.type === "recorded_course") {
    throw new ApiError(
      400,
      "USE_COURSE_ENDPOINT",
      "Recorded courses must be updated through the course management endpoint.",
    );
  }

  const allowedFields = [
    "title",
    "shortDescription",
    "description",
    "thumbnail",
    "gallery",
    "categories",
    "tags",
    "regularPrice",
    "salePrice",
    "isFree",
    "access",
    "seo",
    "status",
  ];

  if (req.body.categories !== undefined) {
    await validateCategories(req.body.categories);
  }

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field];
    }
  }

  if (req.body.slug !== undefined) {
    const newSlug = slugify(req.body.slug);

    if (!newSlug) {
      throw new ApiError(
        400,
        "INVALID_SLUG",
        "A valid product slug is required.",
      );
    }

    const slugExists = await Product.exists({
      slug: newSlug,
      _id: {
        $ne: product._id,
      },
    });

    if (slugExists) {
      throw new ApiError(
        409,
        "PRODUCT_SLUG_EXISTS",
        "Product slug already exists.",
      );
    }

    product.slug = newSlug;
  }

  if (
    req.body.status !== undefined &&
    !["draft", "review", "published", "archived"].includes(req.body.status)
  ) {
    throw new ApiError(
      400,
      "INVALID_PRODUCT_STATUS",
      "Invalid product status.",
    );
  }

  if (product.isFree) {
    product.regularPrice = 0;
    product.salePrice = undefined;
  }

  product.updatedBy = req.user._id;

  await product.save();

  res.json({
    success: true,
    message: "Product updated successfully.",
    data: product,
  });
});

export const deleteAdminProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    deletedAt: null,
  });

  if (!product) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  }

  if (product.type === "recorded_course") {
    throw new ApiError(
      400,
      "USE_COURSE_ENDPOINT",
      "Recorded courses must be managed through the course endpoint.",
    );
  }

  // Soft delete
  product.deletedAt = new Date();

  product.updatedBy = req.user._id;

  await product.save();

  res.json({
    success: true,
    message: "Product deleted successfully.",
  });
});
