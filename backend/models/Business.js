import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    businessId: {
      type: String,
      required: true,
      unique: true,
    },
    knowledgeBase: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Business", businessSchema);