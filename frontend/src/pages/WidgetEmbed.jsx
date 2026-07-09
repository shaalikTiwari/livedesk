import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Sparkles } from "lucide-react";
import socket from "../socket";

function formatTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

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
      if (sender === "agent" || sender === "ai") setAgentTyping(true);
    });

    socket.on("stop_typing", ({ sender }) => {
      if (sender === "agent" || sender === "ai") setAgentTyping(false);
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
      <div className="h-screen w-screen flex items-center justify-center text-sm text-slate-400">
        Missing business configuration
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-white flex flex-col overflow-hidden">
      <div className="bg-blue-600 px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <div className="text-white font-semibold text-sm">LiveDesk Support</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
            <span className="text-blue-100 text-[11px]">{connected ? "Online" : "Reconnecting..."}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center text-sm text-slate-400 pt-8">
            Send a message to start the conversation.
          </div>
        )}

        {messages.map((msg, idx) => {
          const isCustomer = msg.sender === "customer";
          const prevMsg = messages[idx - 1];
          const showLabel = msg.sender === "ai" && (!prevMsg || prevMsg.sender !== "ai");

          return (
            <div key={msg._id || idx} className={`flex flex-col ${isCustomer ? "items-end" : "items-start"}`}>
              {showLabel && (
                <span className="flex items-center gap-1 text-[10px] text-purple-500 mb-1 px-1">
                  <Sparkles size={10} /> AI Assistant
                </span>
              )}
              <div
                className={`px-3 py-2 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                  isCustomer
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-white text-slate-800 rounded-bl-md border border-slate-200"
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{formatTime(msg.createdAt)}</span>
            </div>
          );
        })}

        {agentTyping && (
          <div className="flex items-start">
            <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-white border border-slate-200 flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 border-t border-slate-200 flex gap-2 shrink-0 bg-white">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 border border-slate-200 rounded-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="bg-blue-600 text-white w-9 h-9 rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

export default WidgetEmbed;