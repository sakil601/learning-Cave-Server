import mongoose from 'mongoose';
const fileSchema = new mongoose.Schema({ asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' }, title: String, version: String }, { _id: false });
const schema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  files: [fileSchema],
  existingBuyersCanAccessUpdate: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.models.DigitalProduct || mongoose.model('DigitalProduct', schema);
