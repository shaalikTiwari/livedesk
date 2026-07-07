import express from "express";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";

const router = express.Router();

router.get("/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;

    let conversation = await Conversation.findOne({ conversationId });
    if (!conversation) {
      conversation = await Conversation.create({ conversationId });
    }

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

    res.json({ conversation, messages });
  } catch (err) {
    console.error("Error fetching conversation:", err);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

export default router;