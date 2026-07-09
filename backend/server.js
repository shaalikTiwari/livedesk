import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import messageRoutes from "./routes/messageRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import Message from "./models/Message.js";
import Conversation from "./models/Conversation.js";
import Business from "./models/Business.js";
import { getAIReply } from "./services/aiService.js";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "LiveDesk backend is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/conversations", messageRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

const roomName = (businessId, conversationId) => `${businessId}::${conversationId}`;
const businessRoomName = (businessId) => `business::${businessId}`;

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("join_conversation", ({ businessId, conversationId }) => {
    socket.join(roomName(businessId, conversationId));
  });

  // Agents join this when the dashboard loads, so they get live conversation list updates
  socket.on("join_business", (businessId) => {
    socket.join(businessRoomName(businessId));
  });

  socket.on("typing", ({ businessId, conversationId, sender }) => {
    socket.to(roomName(businessId, conversationId)).emit("typing", { sender });
  });

  socket.on("stop_typing", ({ businessId, conversationId, sender }) => {
    socket.to(roomName(businessId, conversationId)).emit("stop_typing", { sender });
  });

  socket.on("send_message", async ({ businessId, conversationId, sender, text }) => {
    try {
      let conversation = await Conversation.findOne({ businessId, conversationId });
      const isNewConversation = !conversation;

      if (!conversation) {
        conversation = await Conversation.create({ businessId, conversationId });
      }

      const message = await Message.create({ businessId, conversationId, sender, text });
      io.to(roomName(businessId, conversationId)).emit("receive_message", message);

      if (isNewConversation) {
        io.to(businessRoomName(businessId)).emit("conversations_updated");
      }

      // If an AGENT just replied manually, the human has taken over — AI stops responding here on
      if (sender === "agent" && conversation.aiHandling) {
        conversation.aiHandling = false;
        await conversation.save();
        io.to(businessRoomName(businessId)).emit("conversations_updated");
      }

      // If the CUSTOMER sent a message and AI is still handling this conversation, let AI respond
      if (sender === "customer" && conversation.aiHandling) {
        const recentMessages = await Message.find({ businessId, conversationId })
          .sort({ createdAt: 1 })
          .limit(20);

        const business = await Business.findOne({ businessId });
        const businessName = business?.name || "our team";

        const aiResult = await getAIReply(businessName, recentMessages);

        const aiMessage = await Message.create({
          businessId,
          conversationId,
          sender: "ai",
          text: aiResult.text,
        });

        io.to(roomName(businessId, conversationId)).emit("receive_message", aiMessage);

        if (aiResult.escalate) {
          conversation.aiHandling = false;
          await conversation.save();
          io.to(businessRoomName(businessId)).emit("conversations_updated");
        }
      }
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5010;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });