import React, { useState } from "react";
import { Plus, MessageSquare, Settings, Mic, Paperclip, Send, Terminal, Sparkles, ChevronDown } from "lucide-react";

export function BoldDark() {
  const [input, setInput] = useState("");
  const [model, setModel] = useState("GPT-4o");

  const conversations = [
    { id: 1, title: "Draft Q3 Investor Update", time: "2h ago" },
    { id: 2, title: "Summarize product feedback", time: "Yesterday" },
    { id: 3, title: "Email follow-ups for Sarah", time: "Tuesday" },
    { id: 4, title: "Meeting prep: Design Sync", time: "Last week" },
  ];

  const messages = [
    { role: "ai", content: "Hello. I'm connected to your email, contacts, and calendar. What would you like to work on?" },
    { role: "user", content: "Can you draft an email to the design team about the new sync schedule? It should be moved to Tuesdays at 10am." },
    { role: "ai", content: "I'll draft that for you.\n\nSubject: Update: Design Sync moved to Tuesdays\n\nHi Team,\n\nI'm writing to let you know that our weekly Design Sync has been moved to Tuesdays at 10:00 AM, starting next week. \n\nLet me know if you have any conflicts.\n\nBest,\n[Your Name]" },
  ];

  return (
    <div className="flex h-[800px] w-full max-w-[1280px] overflow-hidden rounded-xl border border-[#2d3139] bg-[#0d1117] font-sans text-slate-300 shadow-2xl mx-auto my-8 relative">
      {/* Decorative orbs — matches Merged */}
      <div className="absolute top-[-8%] left-[-5%] w-[35%] h-[40%] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[45%] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", filter: "blur(80px)" }} />
      {/* Sidebar */}
      <div className="flex w-64 flex-col bg-[#161b22] border-r border-[#2d3139] relative z-10">
        <div className="p-4">
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#21262d] px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-[#30363d] focus:outline-none focus:ring-2 focus:ring-[#58a6ff]">
            <Plus className="h-4 w-4" />
            New conversation
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Recent
          </div>
          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-[#21262d]"
              >
                <MessageSquare className="h-4 w-4 text-slate-500" />
                <div className="flex-1 truncate">{conv.title}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-[#2d3139] p-4">
          <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-[#21262d]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <Terminal className="h-4 w-4" />
            </div>
            <div className="flex-1 font-medium">PinnboxIO</div>
            <Settings className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col relative z-10 bg-[#0d1117]">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-[#2d3139] px-6 bg-[#0d1117]/80 backdrop-blur-md z-10 sticky top-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h1 className="text-base font-semibold text-slate-100">Pinnbox Assistant</h1>
          </div>
          
          <div className="flex items-center rounded-full bg-[#161b22] p-1 border border-[#2d3139]">
            {['GPT-4o', 'Claude', 'Gemini'].map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`rounded-full px-4 py-1 text-xs font-medium transition-all ${
                  model === m
                    ? 'bg-indigo-500/20 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)] border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-4 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-[#161b22] border border-[#2d3139] text-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] font-mono text-sm leading-relaxed'
                }`}
                style={msg.role === 'ai' ? {
                   boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px -4px rgba(0,0,0,0.5), 0 0 15px rgba(99,102,241,0.05)'
                } : {}}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-6 pt-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117] to-transparent">
          <div className="relative rounded-2xl border border-[#2d3139] bg-[#161b22] p-2 shadow-2xl focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your emails, contacts, or calendar..."
              className="max-h-32 min-h-[60px] w-full resize-none bg-transparent px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
              rows={1}
            />
            <div className="flex items-center justify-between px-2 pb-1">
              <div className="flex items-center gap-1">
                <button className="rounded-lg p-2 text-slate-400 hover:bg-[#2d3139] hover:text-slate-200 transition-colors">
                  <Paperclip className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-2 text-slate-400 hover:bg-[#2d3139] hover:text-slate-200 transition-colors">
                  <Mic className="h-4 w-4" />
                </button>
              </div>
              <button 
                className="flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 p-2.5 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                disabled={!input.trim()}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-2 text-center text-xs text-slate-500">
            AI can make mistakes. Consider verifying important information.
          </div>
        </div>
      </div>
    </div>
  );
}
