import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  certificateId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  issuedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active','revoked'], default: 'active' },
  revokedAt: Date,
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: { studentName: String, courseTitle: String, instructorName: String },
}, { timestamps: true });
schema.index({ user: 1, course: 1 }, { unique: true });
export default mongoose.models.Certificate || mongoose.model('Certificate', schema);
