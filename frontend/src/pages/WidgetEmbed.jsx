import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import socket from "../socket";

function WidgetEmbed() {
  const [searchParams] = useSearchParams();
  const businessId = searchParams.get("businessId");
  const conversationId = searchParams.get("conversationId");

  const [connected, setConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [agentTyping, setAgentTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!businessId || !conversationId) return;

    fetch(`${import.meta.env.VITE_SOCKET_URL}/api/conversations/${businessId}/${conversationId}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages || []);
      })
      .catch((err) => console.error("Error loading history:", err));

    const joinRoom = () => {
      setConnected(true);
      socket.emit("join_conversation", { businessId, conversationId });
    };

    if (socket.connected) {
      joinRoom();
    }

    socket.on("connect", joinRoom);

    socket.on("receive_message", (message) => {
      if (message.conversationId === conversationId && message.businessId === businessId) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on("typing", ({ sender }) => {
      if (sender === "agent") setAgentTyping(true);
    });

    socket.on("stop_typing", ({ sender }) => {
      if (sender === "agent") setAgentTyping(false);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    return () => {
      socket.off("connect", joinRoom);
      socket.off("receive_message");
      socket.off("typing");
      socket.off("stop_typing");
      socket.off("disconnect");
    };
  }, [businessId, conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentTyping]);

  const sendMessage = () => {
    if (!input.trim() || !businessId || !conversationId) return;

    socket.emit("send_message", {
      businessId,
      conversationId,
      sender: "customer",
      text: input,
    });

    socket.emit("stop_typing", { businessId, conversationId, sender: "customer" });
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);

    socket.emit("typing", { businessId, conversationId, sender: "customer" });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { businessId, conversationId, sender: "customer" });
    }, 1500);
  };

  if (!businessId || !conversationId) {
    return (
      <div className="h-screen w-screen flex items-center justify-center text-sm text-gray-400">
        Missing business configuration
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-white flex flex-col overflow-hidden">
      <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-sm">LiveDesk Support</span>
        <span className={`text-xs px-2 py-1 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}>
          {connected ? "Online" : "Offline"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg._id || Math.random()}
            className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`px-3 py-2 rounded-2xl max-w-[80%] text-sm ${
                msg.sender === "customer"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-200 text-gray-800 rounded-bl-sm"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {agentTyping && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl bg-gray-200 text-gray-500 text-sm italic">
              Agent is typing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 border-t flex gap-2">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 border rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default WidgetEmbed;