import mongoose from 'mongoose';
const lp = new mongoose.Schema({ lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }, watchedSeconds: { type: Number, default: 0 }, completed: { type: Boolean, default: false }, completedAt: Date }, { _id: false });
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment' },
  completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  completedModules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
  lessonProgress: [lp],
  lastLesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
  progressPercent: { type: Number, default: 0, min: 0, max: 100 },
  lastAccessedAt: Date,
  completedAt: Date,
}, { timestamps: true });
schema.index({ user: 1, course: 1 }, { unique: true });
export default mongoose.models.Progress || mongoose.model('Progress', schema);
