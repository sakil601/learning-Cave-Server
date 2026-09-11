import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
  title: { type: String, required: true },
  instructions: String,
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
  required: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.models.Practice || mongoose.model('Practice', schema);
