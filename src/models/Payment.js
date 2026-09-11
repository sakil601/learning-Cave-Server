import mongoose from 'mongoose';
const refundSchema = new mongoose.Schema({ amount: Number, reason: String, reference: String, refundedAt: Date, processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }, { _id: true });
const schema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  method: { type: String, enum: ['bkash','nagad','bank_transfer','sslcommerz','aamarpay','manual'], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending','processing','paid','failed','cancelled','refunded'], default: 'pending' },
  transactionId: { type: String, sparse: true, index: true },
  gatewayReference: String,
  manualProof: { paymentNumber: String, screenshotAsset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' } },
  refunds: [refundSchema],
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
}, { timestamps: true });
export default mongoose.models.Payment || mongoose.model('Payment', schema);
