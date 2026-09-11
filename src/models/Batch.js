import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  liveCourse: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveCourse', required: true, index: true },
  name: { type: String, required: true },
  startDate: Date,
  endDate: Date,
  capacity: Number,
  status: { type: String, enum: ['upcoming','ongoing','completed','cancelled'], default: 'upcoming', index: true },
  enrollmentOpen: Date,
  enrollmentClose: Date,
}, { timestamps: true });
schema.index({ liveCourse: 1, status: 1 });
export default mongoose.models.Batch || mongoose.model('Batch', schema);
