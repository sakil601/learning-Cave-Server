import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true, index: true },
  title: { type: String, required: true },
  passPercentage: { type: Number, default: 80, min: 0, max: 100 },
  timeLimitMinutes: Number,
  maxAttempts: { type: Number, default: 1, min: 1 },
  required: { type: Boolean, default: false },
  showResult: { type: Boolean, default: true },
  showCorrectAnswer: { type: Boolean, default: false },
  randomizeQuestions: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.models.Quiz || mongoose.model('Quiz', schema);
