import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  author: String,
  previewAsset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
  mainAsset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
  version: { type: String, default: '1.0' },
  existingBuyersCanAccessUpdate: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.models.Ebook || mongoose.model('Ebook', schema);
