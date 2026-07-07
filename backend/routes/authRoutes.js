import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Agent from "../models/Agent.js";
import Business from "../models/Business.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, businessName } = req.body;

    if (!name || !email || !password || !businessName) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existing = await Agent.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Generate a URL-safe businessId from the business name
    const businessId =
      businessName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      Math.random().toString(36).slice(2, 7);

    const business = await Business.create({
      name: businessName,
      businessId,
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    const agent = await Agent.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      businessId: business._id,
    });

    const token = jwt.sign({ agentId: agent._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      token,
      agent: { id: agent._id, name: agent.name, email: agent.email },
      business: { id: business._id, name: business.name, businessId: business.businessId },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const agent = await Agent.findOne({ email: email.toLowerCase() }).populate("businessId");
    if (!agent) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, agent.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ agentId: agent._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const business = agent.businessId;

    res.json({
      token,
      agent: { id: agent._id, name: agent.name, email: agent.email },
      business: { id: business._id, name: business.name, businessId: business.businessId },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

export default router;