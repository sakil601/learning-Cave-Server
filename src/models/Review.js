import mongoose from 'mongoose';
const schema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, rating: { type: Number, min: 1, max: 5, required: true }, review: String, status: { type: String, enum: ['published','hidden'], default: 'published' } }, { timestamps: true });
schema.index({ user: 1, product: 1 }, { unique: true });
export default mongoose.models.Review || mongoose.model('Review', schema);
