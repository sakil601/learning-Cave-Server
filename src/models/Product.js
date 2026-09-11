import mongoose from "mongoose";
const accessSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["lifetime", "limited"], default: "lifetime" },
    duration: Number,
    durationUnit: { type: String, enum: ["days", "months", "years"] },
  },
  { _id: false },
);
const schema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "recorded_course",
        "live_course",
        "workshop",
        "ebook",
        "digital_product",
        "bundle",
      ],
      index: true,
    },
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    shortDescription: String,
    description: String,
    thumbnail: String,
    gallery: [String],
    categories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category", index: true },
    ],
    tags: [String],
    regularPrice: { type: Number, min: 0, default: 0 },
    salePrice: { type: Number, min: 0 },
    isFree: { type: Boolean, default: false },
    access: { type: accessSchema, default: () => ({ type: "lifetime" }) },
    ratingSummary: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["draft", "review", "published", "archived"],
      default: "draft",
      index: true,
    },
    publishedAt: Date,
    scheduledPublishAt: Date,
    seo: { metaTitle: String, metaDescription: String, ogImage: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deletedAt: Date,
  },
  { timestamps: true },
);
schema.index({ type: 1, status: 1 });
schema.index({ createdAt: -1 });
export default mongoose.models.Product || mongoose.model("Product", schema);
