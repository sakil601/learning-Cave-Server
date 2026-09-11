import mongoose from 'mongoose';
const schema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true } }, { timestamps: true });
schema.index({ user: 1, product: 1 }, { unique: true });
export default mongoose.models.Wishlist || mongoose.model('Wishlist', schema);
