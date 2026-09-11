import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: { type: String, required: true },
    entityType: String,
    entityId: mongoose.Schema.Types.ObjectId,
    metadata: mongoose.Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: true },
);
export default mongoose.models.AdminActivityLog ||
  mongoose.model("AdminActivityLog", schema);
