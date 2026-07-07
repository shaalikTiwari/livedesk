import { useEffect, useState, useRef } from "react";
import socket from "../socket";

function Dashboard() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // Load conversation list on mount
  useEffect(() => {
    fetch(`${import.meta.env.VITE_SOCKET_URL}/api/conversations`)
      .then((res) => res.json())
      .then((data) => setConversations(data.conversations || []))
      .catch((err) => console.error("Error loading conversations:", err));
  }, []);

  // Listen for new messages globally, to update the list preview
  useEffect(() => {
    socket.on("receive_message", (message) => {
      if (message.conversationId === activeId) {
        setMessages((prev) => [...prev, message]);
      }
    });

    return () => {
      socket.off("receive_message");
    };
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openConversation = (conversationId) => {
    setActiveId(conversationId);
    setMessages([]);

    socket.emit("join_conversation", conversationId);

    fetch(`${import.meta.env.VITE_SOCKET_URL}/api/conversations/${conversationId}`)
      .then((res) => res.json())
      .then((data) => setMessages(data.messages || []))
      .catch((err) => console.error("Error loading messages:", err));
  };

  const sendReply = () => {
    if (!input.trim() || !activeId) return;

    socket.emit("send_message", {
      conversationId: activeId,
      sender: "agent",
      text: input,
    });

    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendReply();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r overflow-y-auto">
        <div className="p-4 border-b font-semibold text-gray-800">
          Conversations
        </div>
        {conversations.map((conv) => (
          <div
            key={conv._id}
            onClick={() => openConversation(conv.conversationId)}
            className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
              activeId === conv.conversationId ? "bg-blue-50" : ""
            }`}
          >
            <div className="font-medium text-sm text-gray-800">
              {conv.customerName || "Anonymous Customer"}
            </div>
            <div className="text-xs text-gray-500">{conv.conversationId}</div>
          </div>
        ))}
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col">
        {activeId ? (
          <>
            <div className="bg-blue-600 text-white px-4 py-3 font-semibold">
              {activeId}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
              {messages.map((msg) => (
                <div
                  key={msg._id || Math.random()}
                  className={`flex ${msg.sender === "agent" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`px-3 py-2 rounded-2xl max-w-[60%] text-sm ${
                      msg.sender === "agent"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-gray-200 text-gray-800 rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a reply..."
                className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendReply}
                className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;