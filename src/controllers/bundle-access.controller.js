import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Bundle from "../models/Bundle.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

export const getMyBundles = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    user: req.user._id,
    paymentStatus: "paid",
    "items.productType": "bundle",
  })
    .sort({
      createdAt: -1,
    })
    .lean();

  const purchasedBundleItems = [];

  for (const order of orders) {
    for (const item of order.items) {
      if (item.productType !== "bundle") {
        continue;
      }

      purchasedBundleItems.push({
        orderId: order._id,
        orderNumber: order.orderNumber,
        purchasedAt: order.updatedAt,
        productId: item.product,
        title: item.title,
        paidAmount: item.lineTotal,
      });
    }
  }

  const productIds = purchasedBundleItems.map((item) => item.productId);

  const products = await Product.find({
    _id: {
      $in: productIds,
    },
    type: "bundle",
    deletedAt: null,
  })
    .select("title slug shortDescription thumbnail status")
    .lean();

  const productMap = new Map(
    products.map((product) => [String(product._id), product]),
  );

  const data = purchasedBundleItems
    .map((item) => ({
      orderId: item.orderId,
      orderNumber: item.orderNumber,
      purchasedAt: item.purchasedAt,
      paidAmount: item.paidAmount,
      product: productMap.get(String(item.productId)) || null,
    }))
    .filter((item) => item.product);

  res.json({
    success: true,
    data,
  });
});

export const getMyBundle = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const order = await Order.findOne({
    user: req.user._id,
    paymentStatus: "paid",
    items: {
      $elemMatch: {
        product: productId,
        productType: "bundle",
      },
    },
  })
    .sort({
      createdAt: -1,
    })
    .lean();

  if (!order) {
    throw new ApiError(
      403,
      "BUNDLE_ACCESS_DENIED",
      "You have not purchased this bundle.",
    );
  }

  const product = await Product.findOne({
    _id: productId,
    type: "bundle",
    deletedAt: null,
  }).lean();

  if (!product) {
    throw new ApiError(
      404,
      "BUNDLE_PRODUCT_NOT_FOUND",
      "Bundle product not found.",
    );
  }

  const bundle = await Bundle.findOne({
    product: product._id,
  })
    .populate({
      path: "items.product",
      select: "title slug type shortDescription thumbnail status",
    })
    .lean();

  if (!bundle) {
    throw new ApiError(
      404,
      "BUNDLE_NOT_FOUND",
      "Bundle configuration not found.",
    );
  }

  const orderItem = order.items.find(
    (item) =>
      String(item.product) === String(productId) &&
      item.productType === "bundle",
  );

  res.json({
    success: true,
    data: {
      purchase: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        purchasedAt: order.updatedAt,
        paidAmount: orderItem?.lineTotal,
      },

      product: {
        _id: product._id,
        title: product.title,
        slug: product.slug,
        shortDescription: product.shortDescription,
        thumbnail: product.thumbnail,
      },

      bundle: {
        _id: bundle._id,

        includeFutureItems: bundle.includeFutureItems,

        items: bundle.items
          .filter((item) => item.product)
          .map((item) => ({
            product: item.product,
          })),
      },
    },
  });
});
