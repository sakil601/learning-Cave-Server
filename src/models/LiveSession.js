import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
  title: { type: String, required: true },
  classDate: { type: Date, required: true },
  startsAt: Date,
  endsAt: Date,
  meetingUrl: String,
  joinBeforeMinutes: { type: Number, default: 15 },
  recording: { provider: { type: String, enum: ['youtube','bunny'] }, videoId: String, duration: Number },
  status: { type: String, enum: ['scheduled','live','completed','cancelled','rescheduled'], default: 'scheduled' },
}, { timestamps: true });
schema.index({ batch: 1, classDate: 1 });
export default mongoose.models.LiveSession || mongoose.model('LiveSession', schema);
