import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

function generateOrderNumber() {
  return `LC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export const createOrder = asyncHandler(async (req, res) => {
  const { items, billing } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(
      400,
      "ORDER_ITEMS_REQUIRED",
      "At least one product is required.",
    );
  }

  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await Product.findOne({
      _id: item.productId,
      status: "published",
      deletedAt: null,
    }).lean();

    if (!product) {
      throw new ApiError(
        404,
        "PRODUCT_NOT_FOUND",
        "One or more products were not found.",
      );
    }

    const price =
      product.salePrice !== undefined && product.salePrice !== null
        ? product.salePrice
        : product.regularPrice;

    const quantity = 1;
    const lineTotal = price * quantity;

    subtotal += lineTotal;

    orderItems.push({
      product: product._id,
      productType: product.type,
      title: product.title,
      regularPrice: product.regularPrice,
      salePrice: product.salePrice,
      quantity,
      lineTotal,
      batch: item.batchId || undefined,
    });
  }

  const order = await Order.create({
    orderNumber: generateOrderNumber(),

    user: req.user._id,

    items: orderItems,

    billing: {
      name: billing?.name || req.user.name,
      email: billing?.email || req.user.email,
      phone: billing?.phone || req.user.phone,
    },

    subtotal,
    total: subtotal,

    currency: "BDT",

    status: "pending",
    paymentStatus: "unpaid",
  });

  res.status(201).json({
    success: true,
    message: "Order created successfully.",
    data: order,
  });
});
