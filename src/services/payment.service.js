import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";

import { createProductAccessFromPaidOrder } from "./product-access.service.js";

import { ApiError } from "../utils/api-error.js";

import { createEnrollmentsFromPaidOrder } from "./enrollment.service.js";

import { recordCouponUsage } from "./coupon.service.js";
import { createBundleAccessFromPaidOrder } from "./bundle-access.service.js";

export async function completePayment({ paymentId, verifiedBy = null }) {
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
  }

  const order = await Order.findById(payment.order);

  if (!order) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
  }

  if (payment.status === "paid" && order.paymentStatus === "paid") {
    return {
      alreadyProcessed: true,
      payment,
      order,
      enrollments: [],
      productAccesses: [],
    };
  }

  payment.status = "paid";

  if (verifiedBy) {
    payment.verifiedBy = verifiedBy;
    payment.verifiedAt = new Date();
  }

  await payment.save();

  order.paymentStatus = "paid";
  order.status = "confirmed";

  await order.save();

  const enrollments = await createEnrollmentsFromPaidOrder(order);

  const productAccesses = await createProductAccessFromPaidOrder(order);

  const bundleAccess = await createBundleAccessFromPaidOrder(order);

  enrollments.push(...bundleAccess.enrollments);

  productAccesses.push(...bundleAccess.productAccesses);

  await recordCouponUsage({
    order,
    userId: order.user,
  });
  const cart = await Cart.findOne({
    user: order.user,
  });

  if (cart) {
    const purchasedItems = order.items.map((item) => ({
      product: String(item.product),
      batch: item.batch ? String(item.batch) : null,
    }));

    cart.items = cart.items.filter((cartItem) => {
      const cartProduct = String(cartItem.product);
      const cartBatch = cartItem.batch ? String(cartItem.batch) : null;

      const purchased = purchasedItems.some(
        (item) => item.product === cartProduct && item.batch === cartBatch,
      );

      return !purchased;
    });

    await cart.save();
  }

  return {
    alreadyProcessed: false,
    payment,
    order,
    enrollments,
    productAccesses,
  };
}
