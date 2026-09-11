import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fileName: { type: String, required: true },
  storageKey: { type: String, required: true },
  mimeType: String,
  size: Number,
  storageProvider: { type: String, enum: ['local','s3','r2','bunny'], default: 'local' },
  visibility: { type: String, enum: ['public','private'], default: 'private' },
}, { timestamps: true });
export default mongoose.models.Asset || mongoose.model('Asset', schema);
