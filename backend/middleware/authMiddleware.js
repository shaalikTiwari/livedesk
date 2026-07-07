import jwt from "jsonwebtoken";
import Agent from "../models/Agent.js";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const agent = await Agent.findById(decoded.agentId).populate("businessId");
    if (!agent) {
      return res.status(401).json({ error: "Agent not found" });
    }

    req.agentId = agent._id;
    req.businessId = agent.businessId.businessId; // the string businessId
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export default authMiddleware;