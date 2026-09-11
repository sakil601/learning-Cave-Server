import mongoose from "mongoose";
const itemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productType: String,
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
    title: String,
    regularPrice: Number,
    salePrice: Number,
    quantity: { type: Number, default: 1 },
    lineTotal: Number,
  },
  { _id: true },
);
const schema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: [itemSchema],
    billing: { name: String, email: String, phone: String },
    subtotal: Number,
    coupon: { code: String, discountAmount: Number },
    total: Number,
    currency: { type: String, default: "BDT" },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "refunded",
        "partially_refunded",
      ],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: [
        "unpaid",
        "pending",
        "paid",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      default: "unpaid",
      index: true,
    },
  },
  { timestamps: true },
);
schema.index({ user: 1, createdAt: -1 });
export default mongoose.models.Order || mongoose.model("Order", schema);
