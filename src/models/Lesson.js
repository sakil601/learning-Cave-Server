import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
  title: { type: String, required: true },
  description: String,
  order: { type: Number, default: 0 },
  video: {
    provider: { type: String, enum: ['youtube','bunny'] },
    videoId: String,
    duration: Number,
  },
  isPreview: { type: Boolean, default: false },
  required: { type: Boolean, default: true },
}, { timestamps: true });
schema.index({ module: 1, order: 1 });
export default mongoose.models.Lesson || mongoose.model('Lesson', schema);
