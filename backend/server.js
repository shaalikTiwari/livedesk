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

// Helper: build a namespaced room name so businesses never collide
const roomName = (businessId, conversationId) => `${businessId}::${conversationId}`;

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("join_conversation", ({ businessId, conversationId }) => {
    const room = roomName(businessId, conversationId);
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
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
      if (!conversation) {
        conversation = await Conversation.create({ businessId, conversationId });
      }

      const message = await Message.create({ businessId, conversationId, sender, text });

      io.to(roomName(businessId, conversationId)).emit("receive_message", message);
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