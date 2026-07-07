import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import messageRoutes from "./routes/messageRoutes.js";
import Message from "./models/Message.js";
import Conversation from "./models/Conversation.js";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "LiveDesk backend is running" });
});

app.use("/api/conversations", messageRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined room ${conversationId}`);
  });

  socket.on("typing", ({ conversationId, sender }) => {
    socket.to(conversationId).emit("typing", { sender });
  });

  socket.on("stop_typing", ({ conversationId, sender }) => {
    socket.to(conversationId).emit("stop_typing", { sender });
  });

  socket.on("send_message", async ({ conversationId, sender, text }) => {
    try {
      let conversation = await Conversation.findOne({ conversationId });
      if (!conversation) {
        conversation = await Conversation.create({ conversationId });
      }

      const message = await Message.create({ conversationId, sender, text });

      io.to(conversationId).emit("receive_message", message);
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