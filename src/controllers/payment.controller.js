import Payment from "../models/Payment.js";
import Order from "../models/Order.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { createEnrollmentsFromPaidOrder } from "../services/enrollment.service.js";
import { completePayment } from "../services/payment.service.js";

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
  const result = await completePayment({
    paymentId: req.params.id,
  });

  res.json({
    success: true,
    message: result.alreadyProcessed
      ? "Payment was already processed."
      : "Payment completed and access granted.",
    data: {
      payment: result.payment,
      order: result.order,
      enrollments: result.enrollments,
    },
  });
});

export const verifyManualPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
  }

  if (payment.method !== "manual") {
    throw new ApiError(
      400,
      "INVALID_PAYMENT_METHOD",
      "Only manual payments can be verified manually.",
    );
  }

  const result = await completePayment({
    paymentId: payment._id,
    verifiedBy: req.user._id,
  });

  res.json({
    success: true,
    message: result.alreadyProcessed
      ? "Payment was already verified."
      : "Manual payment verified successfully.",
    data: {
      payment: result.payment,
      order: result.order,
      enrollments: result.enrollments,
    },
  });
});

export const rejectManualPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
  }

  if (payment.method !== "manual") {
    throw new ApiError(
      400,
      "INVALID_PAYMENT_METHOD",
      "Only manual payments can be rejected manually.",
    );
  }

  payment.status = "failed";
  payment.verifiedBy = req.user._id;
  payment.verifiedAt = new Date();

  await payment.save();

  const order = await Order.findById(payment.order);

  if (order) {
    order.paymentStatus = "failed";
    order.status = "pending";
    await order.save();
  }

  res.json({
    success: true,
    message: "Manual payment rejected.",
    data: payment,
  });
});
