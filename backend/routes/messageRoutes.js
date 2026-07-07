import express from "express";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Dashboard: list conversations for the logged-in agent's business ONLY
router.get("/", authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({ businessId: req.businessId }).sort({
      updatedAt: -1,
    });
    res.json({ conversations });
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Widget: get/create a conversation for a specific business + conversationId
router.get("/:businessId/:conversationId", async (req, res) => {
  try {
    const { businessId, conversationId } = req.params;

    let conversation = await Conversation.findOne({ businessId, conversationId });
    if (!conversation) {
      conversation = await Conversation.create({ businessId, conversationId });
    }

    const messages = await Message.find({ businessId, conversationId }).sort({
      createdAt: 1,
    });

    res.json({ conversation, messages });
  } catch (err) {
    console.error("Error fetching conversation:", err);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

export default router;