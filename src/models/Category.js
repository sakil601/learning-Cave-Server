import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  description: String,
  image: String,
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });
export default mongoose.models.Category || mongoose.model('Category', schema);
