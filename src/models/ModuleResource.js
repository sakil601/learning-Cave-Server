import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["pdf", "practice_file", "ppt", "external_link"],
      required: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    fileName: {
      type: String,
      trim: true,
    },

    order: {
      type: Number,
      default: 0,
    },

    downloadable: {
      type: Boolean,
      default: true,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

schema.index({
  module: 1,
  order: 1,
});

export default mongoose.models.ModuleResource ||
  mongoose.model("ModuleResource", schema);
