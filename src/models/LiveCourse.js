import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  meetingProvider: { type: String, enum: ['zoom','google_meet','teams','custom'], default: 'custom' },
}, { timestamps: true });
export default mongoose.models.LiveCourse || mongoose.model('LiveCourse', schema);
