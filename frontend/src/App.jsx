import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SOCKET_URL);

function App() {
  const [connected, setConnected] = useState(false);
  const [reply, setReply] = useState("");

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to server:", socket.id);
      setConnected(true);
    });

    socket.on("pong_test", (data) => {
      console.log("Got pong_test:", data);
      setReply(data.message);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    return () => {
      socket.off("connect");
      socket.off("pong_test");
      socket.off("disconnect");
    };
  }, []);

  const sendPing = () => {
    socket.emit("ping_test", { text: "Hello from client!" });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold text-gray-800">LiveDesk — Phase 1</h1>
      <p className={connected ? "text-green-600" : "text-red-600"}>
        {connected ? "Connected to server" : "Not connected"}
      </p>
      <button
        onClick={sendPing}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        Send Test Ping
      </button>
      {reply && <p className="text-gray-700">Server replied: {reply}</p>}
    </div>
  );
}

export default App;