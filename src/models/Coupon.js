import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ['fixed','percentage'], required: true },
  discountValue: { type: Number, required: true },
  maxDiscountAmount: Number,
  minimumOrderAmount: Number,
  usageLimit: Number,
  usageLimitPerUser: Number,
  startsAt: Date,
  expiresAt: Date,
  scopeType: { type: String, enum: ['all','products','categories','product_types'], default: 'all' },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  productTypes: [String],
  active: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.models.Coupon || mongoose.model('Coupon', schema);
