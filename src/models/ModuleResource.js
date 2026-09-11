import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['pdf','ppt','excel','zip','doc','link','other'], required: true },
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
  externalUrl: String,
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.models.ModuleResource || mongoose.model('ModuleResource', schema);
