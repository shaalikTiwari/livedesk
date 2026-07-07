import { useEffect, useState, useRef } from "react";
import socket from "../socket";

const BUSINESS_ID = "acme-corp-niiaa"; // <-- keep this as YOUR real businessId
const CONVERSATION_ID = "demo-conversation-1";

function Widget() {
  const [connected, setConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [agentTyping, setAgentTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_SOCKET_URL}/api/conversations/${BUSINESS_ID}/${CONVERSATION_ID}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages || []);
      })
      .catch((err) => console.error("Error loading history:", err));

    const joinRoom = () => {
      setConnected(true);
      socket.emit("join_conversation", { businessId: BUSINESS_ID, conversationId: CONVERSATION_ID });
    };

    // Handle the case where the socket is ALREADY connected before this ran
    if (socket.connected) {
      joinRoom();
    }

    socket.on("connect", joinRoom);

    socket.on("receive_message", (message) => {
      if (message.conversationId === CONVERSATION_ID && message.businessId === BUSINESS_ID) {
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
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentTyping]);

  const sendMessage = () => {
    if (!input.trim()) return;

    socket.emit("send_message", {
      businessId: BUSINESS_ID,
      conversationId: CONVERSATION_ID,
      sender: "customer",
      text: input,
    });

    socket.emit("stop_typing", {
      businessId: BUSINESS_ID,
      conversationId: CONVERSATION_ID,
      sender: "customer",
    });
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);

    socket.emit("typing", {
      businessId: BUSINESS_ID,
      conversationId: CONVERSATION_ID,
      sender: "customer",
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", {
        businessId: BUSINESS_ID,
        conversationId: CONVERSATION_ID,
        sender: "customer",
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-md h-[600px] bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden">
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
          <span className="font-semibold">LiveDesk Support</span>
          <span className={`text-xs px-2 py-1 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}>
            {connected ? "Online" : "Offline"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
          {messages.map((msg) => (
            <div
              key={msg._id || Math.random()}
              className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-3 py-2 rounded-2xl max-w-[75%] text-sm ${
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

        <div className="p-3 border-t flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default Widget;