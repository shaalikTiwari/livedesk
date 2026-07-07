import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// Basic health check route
app.get("/", (req, res) => {
  res.json({ status: "LiveDesk backend is running" });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("ping_test", (data) => {
    console.log("Received ping_test:", data);
    // Echo it back to the same client
    socket.emit("pong_test", { message: "Hello from server!", received: data });
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5010;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});