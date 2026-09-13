import Payment from "../models/Payment.js";
import { ApiError } from "../utils/api-error.js";
import { completePayment } from "./payment.service.js";

export async function completeVerifiedGatewayPayment({
  paymentId,
  transactionId,
  gatewayResponse = null,
}) {
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
  }

  if (payment.method === "manual") {
    throw new ApiError(
      400,
      "INVALID_PAYMENT_METHOD",
      "Manual payments cannot be completed through gateway callback.",
    );
  }

  if (transactionId) {
    payment.transactionId = transactionId;
  }

  if (gatewayResponse) {
    payment.gatewayResponse = gatewayResponse;
  }

  await payment.save();

  return completePayment({
    paymentId: payment._id,
  });
}
