import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";

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

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetch(`${import.meta.env.VITE_SOCKET_URL}/api/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("livedesk_token");
          localStorage.removeItem("livedesk_agent");
          navigate("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setConversations(data.conversations || []);
      })
      .catch((err) => console.error("Error loading conversations:", err));
  }, [token, navigate]);

  useEffect(() => {
    socket.on("receive_message", (message) => {
      if (message.conversationId === activeId) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on("typing", ({ sender }) => {
      if (sender === "customer") setCustomerTyping(true);
    });

    socket.on("stop_typing", ({ sender }) => {
      if (sender === "customer") setCustomerTyping(false);
    });

    return () => {
      socket.off("receive_message");
      socket.off("typing");
      socket.off("stop_typing");
    };
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, customerTyping]);

  const openConversation = (conversationId) => {
    setActiveId(conversationId);
    setMessages([]);
    setCustomerTyping(false);

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

    socket.emit("stop_typing", { conversationId: activeId, sender: "agent" });
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendReply();
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (!activeId) return;

    socket.emit("typing", { conversationId: activeId, sender: "agent" });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { conversationId: activeId, sender: "agent" });
    }, 1500);
  };

  const handleLogout = () => {
    localStorage.removeItem("livedesk_token");
    localStorage.removeItem("livedesk_agent");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className="w-72 bg-white border-r overflow-y-auto flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <div className="font-semibold text-gray-800">Conversations</div>
            {agent && <div className="text-xs text-gray-500">{agent.name}</div>}
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-red-500 hover:underline"
          >
            Logout
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
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
      </div>

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

              {customerTyping && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-2xl bg-gray-200 text-gray-500 text-sm italic">
                    Customer is typing...
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