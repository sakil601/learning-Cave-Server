import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  items: [{ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true } }],
  includeFutureItems: { type: Boolean, default: false },
  futureItemRules: mongoose.Schema.Types.Mixed,
}, { timestamps: true });
export default mongoose.models.Bundle || mongoose.model('Bundle', schema);
