import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    language: { type: String, default: "bn" },
    estimatedDuration: Number,
    completion: {
      autoCompleteVideoPercentage: {
        type: Number,
        default: 90,
        min: 1,
        max: 100,
      },
    },
    certificate: {
      enabled: { type: Boolean, default: false },
      quizPassPercentage: { type: Number, default: 80, min: 0, max: 100 },
    },
  },
  { timestamps: true },
);
export default mongoose.models.Course || mongoose.model("Course", schema);
