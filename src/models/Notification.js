import mongoose from 'mongoose';
const schema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, type: { type: String, required: true }, title: { type: String, required: true }, message: String, link: String, isRead: { type: Boolean, default: false } }, { timestamps: true });
schema.index({ user: 1, isRead: 1, createdAt: -1 });
export default mongoose.models.Notification || mongoose.model('Notification', schema);
