import Product from "../models/Product.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 100);
  const filter = { status: "published", deletedAt: null };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.category) filter.categories = req.query.category;
  if (req.query.free === "true") filter.isFree = true;
  if (req.query.search)
    filter.$or = [
      { title: { $regex: req.query.search, $options: "i" } },
      { shortDescription: { $regex: req.query.search, $options: "i" } },
      { tags: { $regex: req.query.search, $options: "i" } },
    ];
  const sort =
    req.query.sort === "price_asc"
      ? { salePrice: 1, regularPrice: 1 }
      : req.query.sort === "price_desc"
        ? { salePrice: -1, regularPrice: -1 }
        : { createdAt: -1 };
  const [data, total] = await Promise.all([
    Product.find(filter)
      .populate("categories", "name slug")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    slug: req.params.slug,
    status: "published",
    deletedAt: null,
  })
    .populate("categories", "name slug")
    .lean();
  if (!product)
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  res.json({ success: true, data: product });
});
