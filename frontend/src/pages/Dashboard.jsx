import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Send, LogOut, MessageCircle, Sparkles } from "lucide-react";
import socket from "../socket";

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-indigo-500",
];

function getAvatarColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(str) {
  return (str || "?").trim().charAt(0).toUpperCase();
}

function formatTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatListTime(date) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Dashboard() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [customerTyping, setCustomerTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const navigate = useNavigate();

  const token = localStorage.getItem("livedesk_token");
  const agent = JSON.parse(localStorage.getItem("livedesk_agent") || "null");
  const business = JSON.parse(localStorage.getItem("livedesk_business") || "null");
  const businessId = business?.businessId;

  const activeConversation = conversations.find((c) => c.conversationId === activeId);

  const loadConversations = () => {
    fetch(`${import.meta.env.VITE_SOCKET_URL}/api/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.clear();
          navigate("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setConversations(data.conversations || []);
      })
      .catch((err) => console.error("Error loading conversations:", err));
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    loadConversations();
  }, [token, navigate]);

  useEffect(() => {
    if (!businessId) return;
    socket.emit("join_business", businessId);
  }, [businessId]);

  useEffect(() => {
    socket.on("receive_message", (message) => {
      if (message.conversationId === activeId && message.businessId === businessId) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on("typing", ({ sender }) => {
      if (sender === "customer") setCustomerTyping(true);
    });

    socket.on("stop_typing", ({ sender }) => {
      if (sender === "customer") setCustomerTyping(false);
    });

    socket.on("conversations_updated", loadConversations);

    return () => {
      socket.off("receive_message");
      socket.off("typing");
      socket.off("stop_typing");
      socket.off("conversations_updated", loadConversations);
    };
  }, [activeId, businessId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, customerTyping]);

  const openConversation = (conversationId) => {
    setActiveId(conversationId);
    setMessages([]);
    setCustomerTyping(false);

    socket.emit("join_conversation", { businessId, conversationId });

    fetch(`${import.meta.env.VITE_SOCKET_URL}/api/conversations/${businessId}/${conversationId}`)
      .then((res) => res.json())
      .then((data) => setMessages(data.messages || []))
      .catch((err) => console.error("Error loading messages:", err));
  };

  const sendReply = () => {
    if (!input.trim() || !activeId) return;

    socket.emit("send_message", {
      businessId,
      conversationId: activeId,
      sender: "agent",
      text: input,
    });

    socket.emit("stop_typing", { businessId, conversationId: activeId, sender: "agent" });
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendReply();
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (!activeId) return;

    socket.emit("typing", { businessId, conversationId: activeId, sender: "agent" });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { businessId, conversationId: activeId, sender: "agent" });
    }, 1500);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 truncate">
              {business?.name || "LiveDesk"}
            </div>
            {agent && (
              <div className="text-xs text-slate-500 truncate">Signed in as {agent.name}</div>
            )}
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-slate-50 shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              No conversations yet. They'll show up here as customers message you.
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = activeId === conv.conversationId;
              const label = conv.customerName || "Anonymous Customer";
              return (
                <div
                  key={conv._id}
                  onClick={() => openConversation(conv.conversationId)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-l-2 transition-colors ${
                    isActive
                      ? "bg-blue-50 border-l-blue-600"
                      : "border-l-transparent hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full ${getAvatarColor(
                      conv.conversationId
                    )} text-white flex items-center justify-center text-sm font-semibold shrink-0`}
                  >
                    {getInitial(label)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm text-slate-900 truncate">{label}</div>
                      <div className="text-[11px] text-slate-400 shrink-0">
                        {formatListTime(conv.updatedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="text-xs text-slate-500 truncate">{conv.conversationId}</div>
                      {conv.aiHandling ? (
                        <span className="flex items-center gap-0.5 text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full shrink-0">
                          <Sparkles size={9} /> AI
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full shrink-0">
                          Needs you
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {activeId ? (
          <>
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full ${getAvatarColor(
                    activeId
                  )} text-white flex items-center justify-center text-sm font-semibold`}
                >
                  {getInitial(activeConversation?.customerName || "Anonymous Customer")}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {activeConversation?.customerName || "Anonymous Customer"}
                  </div>
                  <div className="text-xs text-slate-400">{activeId}</div>
                </div>
              </div>
              {activeConversation?.aiHandling ? (
                <span className="flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full">
                  <Sparkles size={12} /> AI is handling this
                </span>
              ) : (
                <span className="text-xs bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full">
                  You're handling this
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
              {messages.map((msg, idx) => {
                const isBusinessSide = msg.sender === "agent" || msg.sender === "ai";
                const prevMsg = messages[idx - 1];
                const showAvatar = !prevMsg || prevMsg.sender !== msg.sender;

                return (
                  <div
                    key={msg._id || idx}
                    className={`flex items-end gap-2 ${isBusinessSide ? "justify-end" : "justify-start"}`}
                  >
                    {!isBusinessSide && (
                      <div
                        className={`w-7 h-7 rounded-full ${getAvatarColor(
                          activeId
                        )} text-white flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                          showAvatar ? "" : "invisible"
                        }`}
                      >
                        {getInitial(activeConversation?.customerName || "A")}
                      </div>
                    )}
                    <div
                      className={`flex flex-col ${isBusinessSide ? "items-end" : "items-start"} max-w-[55%]`}
                    >
                      {msg.sender === "ai" && showAvatar && (
                        <span className="flex items-center gap-1 text-[10px] text-purple-500 mb-1 px-1">
                          <Sparkles size={10} /> AI Assistant
                        </span>
                      )}
                      <div
                        className={`px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                          msg.sender === "agent"
                            ? "bg-blue-600 text-white rounded-br-md"
                            : msg.sender === "ai"
                            ? "bg-purple-600 text-white rounded-br-md"
                            : "bg-white text-slate-800 rounded-bl-md border border-slate-200"
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1 px-1">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {customerTyping && (
                <div className="flex items-end gap-2 justify-start">
                  <div
                    className={`w-7 h-7 rounded-full ${getAvatarColor(
                      activeId
                    )} text-white flex items-center justify-center text-[11px] font-semibold shrink-0`}
                  >
                    {getInitial(activeConversation?.customerName || "A")}
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-white border border-slate-200 flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t border-slate-200 p-4 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a reply... (this will take over from AI)"
                className="flex-1 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={sendReply}
                disabled={!input.trim()}
                className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <MessageCircle size={40} strokeWidth={1.5} />
            <p className="text-sm">Select a conversation to view messages</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;