import express from "express";
import Business from "../models/Business.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Get the logged-in agent's business knowledge base
router.get("/knowledge-base", authMiddleware, async (req, res) => {
  try {
    const business = await Business.findOne({ businessId: req.businessId });
    if (!business) return res.status(404).json({ error: "Business not found" });

    res.json({ knowledgeBase: business.knowledgeBase || "" });
  } catch (err) {
    console.error("Error fetching knowledge base:", err);
    res.status(500).json({ error: "Failed to fetch knowledge base" });
  }
});

// Update the logged-in agent's business knowledge base
router.put("/knowledge-base", authMiddleware, async (req, res) => {
  try {
    const { knowledgeBase } = req.body;

    const business = await Business.findOneAndUpdate(
      { businessId: req.businessId },
      { knowledgeBase: knowledgeBase || "" },
      { new: true }
    );

    if (!business) return res.status(404).json({ error: "Business not found" });

    res.json({ knowledgeBase: business.knowledgeBase });
  } catch (err) {
    console.error("Error updating knowledge base:", err);
    res.status(500).json({ error: "Failed to update knowledge base" });
  }
});

export default router;