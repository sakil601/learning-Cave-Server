import User from "../models/User.js";
import Payment from "../models/Payment.js";
import LiveCourse from "../models/LiveCourse.js";
import Product from "../models/Product.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

export const listAdminUsers = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);

  const filter = {};

  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.accountStatus = req.query.status;

  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: "i" } },
      { email: { $regex: req.query.search, $options: "i" } },
      { phone: { $regex: req.query.search, $options: "i" } },
    ];
  }

  const [data, total] = await Promise.all([
    User.find(filter)
      .select(
        "name email phone role accountStatus emailVerified phoneVerified avatar lastLoginAt createdAt updatedAt",
      )
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
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

export const listAdminInstructors = asyncHandler(async (req, res) => {
  req.query.role = "instructor";
  return listAdminUsers(req, res);
});

export const listAdminPayments = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);

  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.method) filter.method = req.query.method;

  if (req.query.search) {
    const users = await User.find({
      $or: [
        { name: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
        { phone: { $regex: req.query.search, $options: "i" } },
      ],
    })
      .select("_id")
      .lean();

    const userIds = users.map((user) => user._id);

    filter.$or = [
      { transactionId: { $regex: req.query.search, $options: "i" } },
      { gatewayReference: { $regex: req.query.search, $options: "i" } },
      { user: { $in: userIds } },
    ];
  }

  const [data, total] = await Promise.all([
    Payment.find(filter)
      .populate("user", "name email phone")
      .populate("order", "orderNumber total status paymentStatus")
      .populate("verifiedBy", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Payment.countDocuments(filter),
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

export const listManagedLiveCourses = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);

  const productFilter = {
    type: "live_course",
    deletedAt: null,
  };

  if (req.query.status) productFilter.status = req.query.status;

  if (req.query.search) {
    productFilter.$or = [
      { title: { $regex: req.query.search, $options: "i" } },
      { slug: { $regex: req.query.search, $options: "i" } },
    ];
  }

  const [products, total] = await Promise.all([
    Product.find(productFilter)
      .select("title slug status regularPrice salePrice thumbnail createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(productFilter),
  ]);

  const productIds = products.map((product) => product._id);

  const liveCourses = await LiveCourse.find({
    product: { $in: productIds },
  })
    .populate("instructor", "name email phone")
    .lean();

  const liveMap = new Map(
    liveCourses.map((liveCourse) => [
      String(liveCourse.product),
      liveCourse,
    ]),
  );

  const data = products.map((product) => ({
    product,
    liveCourse: liveMap.get(String(product._id)) || null,
  }));

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

export const getManagedLiveCourseByProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.productId,
    type: "live_course",
    deletedAt: null,
  }).lean();

  if (!product) {
    throw new ApiError(
      404,
      "LIVE_PRODUCT_NOT_FOUND",
      "Live course product not found.",
    );
  }

  const liveCourse = await LiveCourse.findOne({
    product: product._id,
  })
    .populate("instructor", "name email phone")
    .lean();

  if (!liveCourse) {
    throw new ApiError(
      404,
      "LIVE_COURSE_NOT_FOUND",
      "Live course configuration not found.",
    );
  }

  res.json({
    success: true,
    data: {
      product,
      liveCourse,
    },
  });
});
