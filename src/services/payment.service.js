import Payment from "../models/Payment.js";
import Order from "../models/Order.js";

import { createProductAccessFromPaidOrder } from "./product-access.service.js";

import { ApiError } from "../utils/api-error.js";

import { createEnrollmentsFromPaidOrder } from "./enrollment.service.js";

import { recordCouponUsage } from "./coupon.service.js";

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

  await recordCouponUsage({
    order,
    userId: order.user,
  });

  return {
    alreadyProcessed: false,
    payment,
    order,
    enrollments,
    productAccesses,
  };
}
