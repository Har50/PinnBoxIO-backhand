import React, { useState } from "react";
import { MessageSquare, Plus, Settings, ChevronDown, Mic, Paperclip, Send, MoreHorizontal, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const HISTORY = [
  { id: "1", title: "Project Phoenix update", time: "2h ago" },
  { id: "2", title: "Q3 Marketing budget", time: "Yesterday" },
  { id: "3", title: "Email draft for Sarah", time: "Yesterday" },
  { id: "4", title: "Meeting notes: Design review", time: "Tuesday" },
  { id: "5", title: "Weekly sync summary", time: "Last week" },
  { id: "6", title: "Product requirements doc", time: "Last week" },
];

const SUGGESTIONS = [
  "Summarize my unread emails from today",
  "Find the attachment from John last week",
  "Draft a follow-up to the marketing team",
  "What meetings do I have tomorrow?",
];

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "user",
    content: "Can you summarize the recent updates on Project Phoenix from my email?",
  },
  {
    id: "2",
    role: "assistant",
    content: "Based on your recent emails, here's a summary of the Project Phoenix updates:\n\n• Sarah finalized the design specifications and shared the Figma link.\n• The engineering team completed the backend migration.\n• The timeline has been slightly adjusted; the beta release is now scheduled for November 15th.\n\nWould you like me to draft an update to the stakeholders based on this?",
  },
  {
    id: "3",
    role: "user",
    content: "Yes, draft a short update for the team slack channel. Keep it casual.",
  },
  {
    id: "4",
    role: "assistant",
    content: "Here's a draft for the team Slack channel:\n\nHey team! Quick update on Project Phoenix 🚀 \nDesign specs are finalized (thanks Sarah!), and the backend migration is done. We're adjusting the beta release slightly to Nov 15 to ensure everything is polished. Great work everyone!\n\nLet me know if you want any changes before posting.",
  }
];

export function Minimal() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("GPT-4o");

  return (
    <div className="flex h-[100dvh] w-full bg-white text-zinc-900 font-sans antialiased overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-200 flex flex-col bg-zinc-50/50">
        <div className="p-4 flex items-center justify-between">
          <div className="font-medium text-sm text-zinc-900">PinnboxIO</div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="px-4 pb-4">
          <Button variant="outline" className="w-full justify-start text-zinc-600 border-zinc-200 shadow-none font-normal">
            <Plus className="w-4 h-4 mr-2" />
            New conversation
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-2 space-y-1">
            <div className="px-2 py-1.5 text-xs font-medium text-zinc-400">History</div>
            {HISTORY.map((item) => (
              <button
                key={item.id}
                className="w-full text-left px-2 py-1.5 rounded-md text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors truncate"
              >
                {item.title}
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-zinc-200">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 rounded-md">
              <AvatarFallback className="bg-zinc-200 text-zinc-600 text-xs rounded-md">JD</AvatarFallback>
            </Avatar>
            <div className="text-sm font-medium text-zinc-700 truncate">John Doe</div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-transparent">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-medium text-zinc-900">Assistant</h1>
            <span className="text-zinc-300">/</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs font-normal text-zinc-500 hover:text-zinc-900 -ml-2">
                  {model}
                  <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40 rounded-xl shadow-sm border-zinc-200">
                {["GPT-4o", "Claude 3.5 Sonnet", "Gemini 1.5 Pro"].map((m) => (
                  <DropdownMenuItem 
                    key={m} 
                    className="text-sm cursor-pointer"
                    onClick={() => setModel(m)}
                  >
                    <span className="flex-1">{m}</span>
                    {model === m && <Check className="w-3 h-3 text-zinc-900" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </header>

        {/* Chat Messages */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 md:px-8 flex flex-col gap-8">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
                <div className="h-12 w-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-6">
                  <MessageSquare className="w-6 h-6 text-zinc-400" />
                </div>
                <h2 className="text-xl font-medium text-zinc-900 mb-2">How can I help you today?</h2>
                <p className="text-zinc-500 mb-8 text-sm">I can search your emails, check your calendar, and manage contacts.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {SUGGESTIONS.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion)}
                      className="p-4 rounded-xl border border-zinc-200 text-left text-sm text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex w-full",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] text-[15px] leading-relaxed",
                      message.role === "user"
                        ? "bg-[#F3F4F6] text-zinc-900 px-5 py-3 rounded-2xl rounded-tr-sm"
                        : "text-zinc-800 pr-8 whitespace-pre-wrap"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 sm:p-6 pt-0 bg-gradient-to-t from-white via-white to-white/0">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden focus-within:ring-1 focus-within:ring-zinc-200 focus-within:border-zinc-300 transition-all">
              <div className="flex pb-2 pl-2">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/50 rounded-full">
                  <Paperclip className="w-4 h-4" />
                </Button>
              </div>
              
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message Assistant..."
                className="min-h-[56px] max-h-[200px] w-full resize-none border-0 bg-transparent py-4 px-2 shadow-none focus-visible:ring-0 text-[15px] placeholder:text-zinc-400"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim()) {
                      setMessages([...messages, { id: Date.now().toString(), role: "user", content: input }]);
                      setInput("");
                    }
                  }
                }}
              />

              <div className="flex pb-2 pr-2 gap-1">
                {input.trim() ? (
                  <Button 
                    size="icon" 
                    className="h-9 w-9 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full shadow-sm"
                    onClick={() => {
                      if (input.trim()) {
                        setMessages([...messages, { id: Date.now().toString(), role: "user", content: input }]);
                        setInput("");
                      }
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/50 rounded-full">
                    <Mic className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="text-center mt-3">
              <p className="text-xs text-zinc-400">Assistant can make mistakes. Consider verifying important information.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
