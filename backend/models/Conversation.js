import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
    },
    businessId: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      default: "Anonymous Customer",
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    aiHandling: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

conversationSchema.index({ businessId: 1, conversationId: 1 }, { unique: true });

export default mongoose.model("Conversation", conversationSchema);