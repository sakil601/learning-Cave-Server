import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "main" },
    site: mongoose.Schema.Types.Mixed,
    currency: { type: String, default: "BDT" },
    payment: mongoose.Schema.Types.Mixed,
    video: mongoose.Schema.Types.Mixed,
    storage: mongoose.Schema.Types.Mixed,
    email: mongoose.Schema.Types.Mixed,
    certificate: mongoose.Schema.Types.Mixed,
    security: mongoose.Schema.Types.Mixed,
    liveClassReminder: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);
export default mongoose.models.Settings || mongoose.model("Settings", schema);
