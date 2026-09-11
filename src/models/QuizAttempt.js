import mongoose from 'mongoose';
const answerSchema = new mongoose.Schema({ question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' }, answer: Boolean, correct: Boolean, marksEarned: Number }, { _id: false });
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
  enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment' },
  attemptNumber: { type: Number, required: true },
  answers: [answerSchema],
  score: Number,
  totalMarks: Number,
  percentage: Number,
  passed: Boolean,
  startedAt: { type: Date, default: Date.now },
  submittedAt: Date,
}, { timestamps: true });
schema.index({ user: 1, quiz: 1, attemptNumber: 1 }, { unique: true });
export default mongoose.models.QuizAttempt || mongoose.model('QuizAttempt', schema);
