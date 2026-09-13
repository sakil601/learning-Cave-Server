import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { createEnrollmentsFromPaidOrder } from "../services/enrollment.service.js";

export const createPayment = asyncHandler(async (req, res) => {
  const { orderId, method, transactionId } = req.body;

  const order = await Order.findOne({
    _id: orderId,
    user: req.user._id,
  });

  if (!order) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
  }

  if (order.paymentStatus === "paid") {
    throw new ApiError(
      400,
      "ORDER_ALREADY_PAID",
      "This order is already paid.",
    );
  }

  const payment = await Payment.create({
    order: order._id,
    user: req.user._id,
    method,
    amount: order.total,
    transactionId,
    status: "pending",
  });

  res.status(201).json({
    success: true,
    message: "Payment created successfully.",
    data: payment,
  });
});

export const markPaymentPaid = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
  }

  const order = await Order.findById(payment.order);

  if (!order) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
  }

  if (payment.status !== "paid") {
    payment.status = "paid";
    await payment.save();
  }

  if (order.paymentStatus !== "paid") {
    order.paymentStatus = "paid";
    order.status = "confirmed";
    await order.save();
  }

  const enrollments = await createEnrollmentsFromPaidOrder(order);

  res.json({
    success: true,
    message: "Payment completed and access granted.",
    data: {
      payment,
      order,
      enrollments,
    },
  });
});
