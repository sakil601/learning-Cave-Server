import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bio: String,
  expertise: [String],
  experience: String,
  qualification: String,
  socialLinks: { type: Map, of: String },
  approval: { reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, reviewedAt: Date, note: String },
}, { timestamps: true });
export default mongoose.models.InstructorProfile || mongoose.model('InstructorProfile', schema);
