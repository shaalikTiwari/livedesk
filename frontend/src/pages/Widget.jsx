import { useEffect, useState, useRef } from "react";
import { Send, Sparkles, RotateCcw } from "lucide-react";
import socket from "../socket";

const BUSINESS_ID = "livedesk-enot0"; // <-- keep this as YOUR real businessId
const STORAGE_KEY = `livedesk_test_conversation_${BUSINESS_ID}`;

function getOrCreateConversationId() {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = "test-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

function formatTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function Widget() {
  const [conversationId, setConversationId] = useState(getOrCreateConversationId());
  const [connected, setConnected] = useState(socket.connected);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [agentTyping, setAgentTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_SOCKET_URL}/api/conversations/${BUSINESS_ID}/${conversationId}`)
      .then((res) => res.json())
      .then((data) => setMessages(data.messages || []))
      .catch((err) => console.error("Error loading history:", err));

    const joinRoom = () => {
      setConnected(true);
      socket.emit("join_conversation", { businessId: BUSINESS_ID, conversationId });
    };

    if (socket.connected) joinRoom();
    socket.on("connect", joinRoom);

    socket.on("receive_message", (message) => {
      if (message.conversationId === conversationId && message.businessId === BUSINESS_ID) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on("typing", ({ sender }) => {
      if (sender === "agent" || sender === "ai") setAgentTyping(true);
    });

    socket.on("stop_typing", ({ sender }) => {
      if (sender === "agent" || sender === "ai") setAgentTyping(false);
    });

    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.off("connect", joinRoom);
      socket.off("receive_message");
      socket.off("typing");
      socket.off("stop_typing");
      socket.off("disconnect");
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentTyping]);

  const startNewConversation = () => {
    const newId = "test-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now();
    localStorage.setItem(STORAGE_KEY, newId);
    setMessages([]);
    setConversationId(newId);
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    socket.emit("send_message", { businessId: BUSINESS_ID, conversationId, sender: "customer", text: input });
    socket.emit("stop_typing", { businessId: BUSINESS_ID, conversationId, sender: "customer" });
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    socket.emit("typing", { businessId: BUSINESS_ID, conversationId, sender: "customer" });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { businessId: BUSINESS_ID, conversationId, sender: "customer" });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-2">
          <button
            onClick={startNewConversation}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors"
          >
            <RotateCcw size={12} /> Start new conversation
          </button>
        </div>

        <div className="h-[640px] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden border border-slate-200">
          <div className="bg-blue-600 px-5 py-4 flex items-center justify-between shrink-0">
            <div>
              <div className="text-white font-semibold text-sm">LiveDesk Support</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
                <span className="text-blue-100 text-xs">
                  {connected ? "We typically reply in a few minutes" : "Reconnecting..."}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
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
                    className={`px-4 py-2 rounded-2xl max-w-[78%] text-sm leading-relaxed ${
                      isCustomer
                        ? "bg-blue-600 text-white rounded-br-md"
                        : msg.sender === "ai"
                        ? "bg-purple-50 text-purple-900 border border-purple-200 rounded-bl-md"
                        : "bg-white text-slate-800 rounded-bl-md border border-slate-200"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 px-1">{formatTime(msg.createdAt)}</span>
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

          <div className="p-3 border-t border-slate-200 flex gap-2 shrink-0 bg-white">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Widget;