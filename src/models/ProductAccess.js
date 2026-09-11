import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  sourceType: { type: String, enum: ['purchase','bundle','admin','coupon','promotion'], required: true },
  sourceId: mongoose.Schema.Types.ObjectId,
  accessType: { type: String, enum: ['lifetime','limited'], default: 'lifetime' },
  startsAt: { type: Date, default: Date.now },
  expiresAt: Date,
  status: { type: String, enum: ['active','expired','revoked'], default: 'active', index: true },
}, { timestamps: true });
schema.index({ user: 1, product: 1, sourceType: 1, sourceId: 1 }, { unique: true });
export default mongoose.models.ProductAccess || mongoose.model('ProductAccess', schema);
