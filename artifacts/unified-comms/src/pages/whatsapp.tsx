import { useState } from "react";
import { MessageCircle, Phone, Video, MoreVertical, Search, Send, Smile, Paperclip, ChevronLeft, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

const WA_GREEN = "#25D366";
const WA_DARK = "#128C7E";

type Chat = {
  id: string;
  name: string;
  lastMessage: string;
  time: Date;
  unread: number;
  avatar: string;
  online: boolean;
};

type Message = {
  id: string;
  text: string;
  fromMe: boolean;
  time: Date;
  status: "sent" | "delivered" | "read";
};

const MOCK_CHATS: Chat[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    lastMessage: "Can we reschedule the call to 3pm?",
    time: new Date(Date.now() - 18 * 60 * 1000),
    unread: 2,
    avatar: "SJ",
    online: true,
  },
  {
    id: "2",
    name: "Work Team",
    lastMessage: "Alex: The report is ready for review",
    time: new Date(Date.now() - 55 * 60 * 1000),
    unread: 5,
    avatar: "WT",
    online: false,
  },
  {
    id: "3",
    name: "Mike Chen",
    lastMessage: "Thanks, I got it!",
    time: new Date(Date.now() - 26 * 60 * 60 * 1000),
    unread: 0,
    avatar: "MC",
    online: false,
  },
  {
    id: "4",
    name: "Family Group",
    lastMessage: "Mom: Dinner at 7pm on Sunday",
    time: new Date(Date.now() - 28 * 60 * 60 * 1000),
    unread: 1,
    avatar: "FG",
    online: false,
  },
  {
    id: "5",
    name: "Lisa Park",
    lastMessage: "Looking forward to the meeting",
    time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    unread: 0,
    avatar: "LP",
    online: true,
  },
  {
    id: "6",
    name: "David Wilson",
    lastMessage: "Sent you the invoice",
    time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    unread: 0,
    avatar: "DW",
    online: false,
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  "1": [
    { id: "1", text: "Hi! Are we still on for the call tomorrow?", fromMe: false, time: new Date(Date.now() - 30 * 60 * 1000), status: "read" },
    { id: "2", text: "Yes definitely! Looking forward to it.", fromMe: true, time: new Date(Date.now() - 28 * 60 * 1000), status: "read" },
    { id: "3", text: "Great. Can we reschedule the call to 3pm?", fromMe: false, time: new Date(Date.now() - 18 * 60 * 1000), status: "delivered" },
    { id: "4", text: "Something came up in the morning", fromMe: false, time: new Date(Date.now() - 18 * 60 * 1000), status: "delivered" },
  ],
  "2": [
    { id: "1", text: "Hey team, status update?", fromMe: true, time: new Date(Date.now() - 70 * 60 * 1000), status: "read" },
    { id: "2", text: "Frontend is done, deploying now", fromMe: false, time: new Date(Date.now() - 65 * 60 * 1000), status: "read" },
    { id: "3", text: "Backend tests are passing", fromMe: false, time: new Date(Date.now() - 60 * 60 * 1000), status: "read" },
    { id: "4", text: "The report is ready for review", fromMe: false, time: new Date(Date.now() - 55 * 60 * 1000), status: "delivered" },
  ],
};

function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function WhatsApp() {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = MOCK_CHATS.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const messages = selectedChat ? (MOCK_MESSAGES[selectedChat.id] ?? []) : [];

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "#f0f2f5" }}>
      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col border-r border-gray-200 bg-white",
          selectedChat ? "hidden md:flex md:w-80 lg:w-96" : "flex w-full md:w-80 lg:w-96"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: WA_DARK }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
              style={{ backgroundColor: WA_GREEN }}
            >
              Me
            </div>
            <span className="text-white font-semibold text-base">WhatsApp</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-white/80 hover:text-white transition-colors">
              <MessageCircle size={20} />
            </button>
            <button className="text-white/80 hover:text-white transition-colors">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Connect banner */}
        <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-100">
          <Wifi size={15} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            Open WhatsApp on your phone to sync your real messages
          </p>
        </div>

        {/* Search */}
        <div className="px-3 py-2 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
            <Search size={15} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search or start new chat"
              className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors text-left",
                selectedChat?.id === chat.id && "bg-gray-100"
              )}
            >
              <div className="relative shrink-0">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                  style={{ backgroundColor: WA_DARK }}
                >
                  {chat.avatar}
                </div>
                {chat.online && (
                  <div
                    className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white"
                    style={{ backgroundColor: WA_GREEN }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="font-medium text-sm text-gray-900 truncate">{chat.name}</span>
                  <span
                    className="text-xs shrink-0 ml-2"
                    style={{ color: chat.unread > 0 ? WA_GREEN : "#aaa" }}
                  >
                    {formatTime(chat.time)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 truncate">{chat.lastMessage}</span>
                  {chat.unread > 0 && (
                    <span
                      className="ml-2 text-xs text-white font-medium rounded-full px-1.5 py-0.5 min-w-[20px] text-center shrink-0"
                      style={{ backgroundColor: WA_GREEN }}
                    >
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation pane */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Conv header */}
          <div className="flex items-center gap-3 px-4 py-2.5" style={{ backgroundColor: WA_DARK }}>
            <button
              className="md:hidden text-white mr-1"
              onClick={() => setSelectedChat(null)}
            >
              <ChevronLeft size={22} />
            </button>
            <div className="relative shrink-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                style={{ backgroundColor: WA_GREEN }}
              >
                {selectedChat.avatar}
              </div>
              {selectedChat.online && (
                <div
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                  style={{ backgroundColor: WA_GREEN, borderColor: WA_DARK }}
                />
              )}
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm leading-tight">{selectedChat.name}</p>
              {selectedChat.online && (
                <p className="text-white/70 text-xs">online</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button className="text-white/80 hover:text-white transition-colors">
                <Video size={20} />
              </button>
              <button className="text-white/80 hover:text-white transition-colors">
                <Phone size={20} />
              </button>
              <button className="text-white/80 hover:text-white transition-colors">
                <Search size={20} />
              </button>
              <button className="text-white/80 hover:text-white transition-colors">
                <MoreVertical size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1"
            style={{ backgroundColor: "#e5ddd5" }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex", msg.fromMe ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[65%] rounded-lg px-3 py-2 shadow-sm",
                    msg.fromMe ? "rounded-tr-sm" : "rounded-tl-sm bg-white"
                  )}
                  style={msg.fromMe ? { backgroundColor: "#dcf8c6" } : {}}
                >
                  <p className="text-sm text-gray-800 leading-relaxed">{msg.text}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[11px] text-gray-400">
                      {msg.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {msg.fromMe && (
                      <svg width="14" height="9" viewBox="0 0 16 11" fill="none">
                        <path
                          d="M1 5.5L5.5 10L15 1"
                          stroke={msg.status === "read" ? "#34B7F1" : "#aaa"}
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {msg.status !== "sent" && (
                          <path
                            d="M5 5.5L9.5 10L19 1"
                            stroke={msg.status === "read" ? "#34B7F1" : "#aaa"}
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-gray-500">No messages yet. Say hello!</p>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="flex items-end gap-2 px-4 py-2 bg-gray-100 border-t border-gray-200">
            <button className="text-gray-500 hover:text-gray-700 mb-2">
              <Smile size={22} />
            </button>
            <button className="text-gray-500 hover:text-gray-700 mb-2">
              <Paperclip size={22} />
            </button>
            <div className="flex-1 bg-white rounded-full px-4 py-2.5 flex items-center">
              <input
                type="text"
                placeholder="Type a message"
                className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-400 bg-transparent"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setInputText("");
                }}
              />
            </div>
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors"
              style={{ backgroundColor: inputText.trim() ? WA_GREEN : WA_DARK }}
              onClick={() => setInputText("")}
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-4" style={{ backgroundColor: "#f0f2f5" }}>
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: WA_GREEN + "20" }}
          >
            <MessageCircle size={36} style={{ color: WA_GREEN }} />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-light text-gray-700 mb-2">WhatsApp</h2>
            <p className="text-sm text-gray-500 max-w-xs">
              Select a conversation to start messaging. Open WhatsApp on your phone to sync your real messages.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
