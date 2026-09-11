import mongoose from 'mongoose';
const schema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true }, downloadedAt: { type: Date, default: Date.now } }, { timestamps: false });
export default mongoose.models.DownloadHistory || mongoose.model('DownloadHistory', schema);
