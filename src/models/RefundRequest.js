import mongoose from 'mongoose';
const item = new mongoose.Schema({ orderItem: mongoose.Schema.Types.ObjectId, refundAmount: Number }, { _id: false });
const schema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true }, items: [item], reason: String, status: { type: String, enum: ['pending','approved','rejected','processed'], default: 'pending' }, reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, reviewedAt: Date, adminNote: String }, { timestamps: true });
export default mongoose.models.RefundRequest || mongoose.model('RefundRequest', schema);
