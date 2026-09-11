import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  question: { type: String, required: true },
  correctAnswer: { type: Boolean, required: true },
  marks: { type: Number, default: 1, min: 0 },
  order: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ quiz: 1, order: 1 });
export default mongoose.models.Question || mongoose.model('Question', schema);
