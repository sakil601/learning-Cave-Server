import mongoose from 'mongoose';
const itemSchema = new mongoose.Schema({ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }, addedAt: { type: Date, default: Date.now } });
const schema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, items: [itemSchema] }, { timestamps: true });
export default mongoose.models.Cart || mongoose.model('Cart', schema);
