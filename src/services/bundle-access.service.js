import Bundle from "../models/Bundle.js";
import Product from "../models/Product.js";

import { createEnrollmentsFromPaidOrder } from "./enrollment.service.js";

import { createProductAccessFromPaidOrder } from "./product-access.service.js";

export async function createBundleAccessFromPaidOrder(order) {
  const results = {
    enrollments: [],
    productAccesses: [],
  };

  for (const orderItem of order.items) {
    if (orderItem.productType !== "bundle") {
      continue;
    }

    const bundle = await Bundle.findOne({
      product: orderItem.product,
    }).lean();

    if (!bundle) {
      continue;
    }

    const childIds = bundle.items.map((item) => item.product);

    const childProducts = await Product.find({
      _id: {
        $in: childIds,
      },
      deletedAt: null,
    }).lean();

    const virtualOrder = {
      _id: order._id,
      user: order.user,

      items: childProducts.map((product) => ({
        product: product._id,
        productType: product.type,
      })),
    };

    const enrollments = await createEnrollmentsFromPaidOrder(virtualOrder, {
      sourceType: "bundle",
      sourceId: bundle._id,
    });

    const productAccesses = await createProductAccessFromPaidOrder(
      virtualOrder,
      {
        sourceType: "bundle",
        sourceId: bundle._id,
      },
    );

    results.enrollments.push(...enrollments);

    results.productAccesses.push(...productAccesses);
  }

  return results;
}
