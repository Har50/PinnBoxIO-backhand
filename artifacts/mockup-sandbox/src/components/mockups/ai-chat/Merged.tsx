import React, { useState } from "react";
import {
  Plus, MessageSquare, Mic, Paperclip, Send,
  Sparkles, Settings, Search, Command, Trash2
} from "lucide-react";

export function Merged() {
  const [input, setInput] = useState("");
  const [model, setModel] = useState("GPT-4o");
  const [activeId, setActiveId] = useState(1);

  const conversations = [
    { id: 1, title: "Q4 Planning & Emails", time: "Just now", group: "Today" },
    { id: 2, title: "Draft investor update", time: "2h ago", group: "Today" },
    { id: 3, title: "Summarize product feedback", time: "Yesterday", group: "Previous 7 Days" },
    { id: 4, title: "Email follow-ups for Sarah", time: "Tuesday", group: "Previous 7 Days" },
    { id: 5, title: "Meeting prep: Design Sync", time: "Last week", group: "Previous 7 Days" },
  ];

  const grouped: Record<string, typeof conversations> = {};
  for (const c of conversations) {
    if (!grouped[c.group]) grouped[c.group] = [];
    grouped[c.group].push(c);
  }

  const suggestedPrompts = [
    "Summarize my unread emails",
    "Find time for a sync next week",
    "Draft a reply to the last email from John",
  ];

  const messages = [
    { role: "user", content: "Can you summarize any urgent emails I received overnight? And do I have any conflicts for a 2PM meeting?" },
    {
      role: "ai", content: "", structured: true,
    },
  ];

  return (
    <div
      className="flex h-[800px] w-[1280px] overflow-hidden font-sans text-white relative antialiased"
      style={{ background: "#0d1117" }}
    >
      {/* Decorative orbs */}
      <div className="absolute top-[-8%] left-[-5%] w-[35%] h-[40%] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[45%] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", filter: "blur(80px)" }} />

      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col relative z-10 border-r" style={{ background: "rgba(22,27,34,0.85)", borderColor: "#2d3139", backdropFilter: "blur(16px)" }}>
        <div className="p-4 pt-5">
          <button className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-medium transition-colors group border"
            style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >
            <Plus className="h-4 w-4 text-indigo-300" />
            New conversation
            <span className="ml-auto flex gap-0.5 opacity-40 text-[10px]"><Command className="h-3 w-3" />N</span>
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />
            <input
              type="text"
              placeholder="Search history..."
              className="w-full rounded-lg py-1.5 pl-8 pr-3 text-sm placeholder:text-white/30 focus:outline-none transition-all border"
              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)" }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5 custom-sb">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <p className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.28)" }}>{group}</p>
              {items.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-all group relative"
                  style={{
                    background: activeId === conv.id ? "rgba(99,102,241,0.15)" : "transparent",
                    borderLeft: activeId === conv.id ? "2px solid rgba(99,102,241,0.6)" : "2px solid transparent",
                    color: activeId === conv.id ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" style={{ color: activeId === conv.id ? "#818cf8" : "rgba(255,255,255,0.3)" }} />
                  <span className="truncate flex-1">{conv.title}</span>
                  <Trash2 className="h-3 w-3 opacity-0 group-hover:opacity-40 shrink-0" />
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="p-4 border-t" style={{ borderColor: "#2d3139" }}>
          <button className="flex items-center gap-3 w-full p-2 rounded-lg transition-colors"
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div className="w-8 h-8 rounded-full p-[1.5px] shrink-0" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <div className="w-full h-full rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: "#161b22" }}>JD</div>
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-white/90">John Doe</div>
              <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Pro Plan</div>
            </div>
            <Settings className="h-4 w-4" style={{ color: "rgba(255,255,255,0.3)" }} />
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-6 border-b shrink-0" style={{ borderColor: "#2d3139", background: "rgba(13,17,23,0.85)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 0 16px rgba(99,102,241,0.4)" }}>
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-white">Pinnbox Assistant</h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ background: "rgba(99,102,241,0.15)", borderColor: "rgba(99,102,241,0.35)", color: "#a5b4fc" }}>PRO</span>
              </div>
            </div>
          </div>

          <div className="flex items-center p-1 rounded-full border" style={{ background: "rgba(22,27,34,0.9)", borderColor: "#2d3139" }}>
            {["GPT-4o", "Claude", "Gemini"].map(m => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className="rounded-full px-4 py-1 text-xs font-medium transition-all"
                style={model === m ? {
                  background: "rgba(99,102,241,0.22)",
                  color: "#c7d2fe",
                  border: "1px solid rgba(99,102,241,0.35)",
                  boxShadow: "0 0 12px rgba(99,102,241,0.2)"
                } : {
                  background: "transparent",
                  color: "rgba(255,255,255,0.4)",
                  border: "1px solid transparent",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 pb-40 space-y-6 custom-sb">
          {/* Welcome */}
          <div className="flex flex-col items-center text-center mt-4 mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 border" style={{ background: "rgba(99,102,241,0.12)", borderColor: "rgba(99,102,241,0.25)", boxShadow: "0 0 30px rgba(99,102,241,0.1)" }}>
              <Sparkles className="h-7 w-7" style={{ color: "#a5b4fc" }} />
            </div>
            <h2 className="text-lg font-light tracking-tight text-white/90 mb-1">Good morning, John</h2>
            <p className="text-sm max-w-sm" style={{ color: "rgba(255,255,255,0.4)" }}>I've synced with your inbox and calendar. What would you like to focus on today?</p>
          </div>

          {/* User message */}
          <div className="flex justify-end">
            <div className="max-w-[72%] rounded-2xl rounded-br-sm px-5 py-3.5 text-sm text-white shadow-lg"
              style={{ background: "linear-gradient(135deg, #3b4fd1, #6366f1)", border: "1px solid rgba(255,255,255,0.1)" }}>
              Can you summarize any urgent emails I received overnight? And do I have any conflicts for a 2PM meeting?
            </div>
          </div>

          {/* AI message with glass */}
          <div className="flex justify-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 border" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 0 10px rgba(99,102,241,0.3)" }}>
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="max-w-[78%] rounded-2xl rounded-tl-sm px-5 py-4 border relative"
              style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.12)", boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.08)" }}>
              <div className="absolute inset-0 rounded-2xl rounded-tl-sm pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%)" }} />
              <div className="relative z-10 text-sm leading-relaxed space-y-3" style={{ color: "rgba(255,255,255,0.88)" }}>
                <p>You have <strong className="text-white">3 urgent emails</strong> that need your attention:</p>
                <div className="space-y-2">
                  <div className="flex gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
                    <div className="w-1 rounded-full shrink-0 mt-0.5" style={{ background: "#f87171" }} />
                    <div>
                      <div className="text-sm font-medium text-white">Sarah Jenkins · Product Launch</div>
                      <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>We need approval on the final copy before 12 PM EST.</div>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
                    <div className="w-1 rounded-full shrink-0 mt-0.5" style={{ background: "#fbbf24" }} />
                    <div>
                      <div className="text-sm font-medium text-white">AWS Billing · High Usage Alert</div>
                      <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>Your projected spend this month is 40% higher than usual.</div>
                    </div>
                  </div>
                </div>
                <p>You're <strong className="text-white">free at 2:00 PM</strong>. Next meeting is at 3:30 PM with Design Team.</p>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t relative z-10" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <button className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors border"
                  style={{ color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <Sparkles className="h-3 w-3" /> Draft reply to Sarah
                </button>
                <button className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors border"
                  style={{ color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
                  Create 2PM event
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Input area */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 pointer-events-none" style={{ background: "linear-gradient(to top, #0d1117 55%, transparent)" }}>
          <div className="max-w-3xl mx-auto pointer-events-auto">
            {/* Floating chips */}
            <div className="flex gap-2 overflow-x-auto no-sb pb-3 mask-fade">
              {suggestedPrompts.map((p, i) => (
                <button key={i} className="whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs border transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)" }}
                  onMouseEnter={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.09)"); (e.currentTarget.style.color = "white"); }}
                  onMouseLeave={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.05)"); (e.currentTarget.style.color = "rgba(255,255,255,0.6)"); }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input box */}
            <div className="rounded-[22px] p-2 border flex flex-col transition-all"
              style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(24px)", borderColor: "rgba(255,255,255,0.14)", boxShadow: "0 10px 40px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.09)" }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about your emails, schedule, or contacts..."
                className="w-full bg-transparent resize-none text-sm placeholder:text-white/30 px-3 pt-2 pb-1 focus:outline-none min-h-[44px] max-h-[120px] text-white/90"
                rows={1}
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-1">
                  <button className="p-2 rounded-full transition-colors" style={{ color: "rgba(255,255,255,0.45)" }}
                    onMouseEnter={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.08)"); (e.currentTarget.style.color = "white"); }}
                    onMouseLeave={e => { (e.currentTarget.style.background = "transparent"); (e.currentTarget.style.color = "rgba(255,255,255,0.45)"); }}>
                    <Plus className="h-4 w-4" />
                  </button>
                  <button className="p-2 rounded-full transition-colors" style={{ color: "rgba(255,255,255,0.45)" }}
                    onMouseEnter={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.08)"); (e.currentTarget.style.color = "white"); }}
                    onMouseLeave={e => { (e.currentTarget.style.background = "transparent"); (e.currentTarget.style.color = "rgba(255,255,255,0.45)"); }}>
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button className="p-2 rounded-full transition-colors" style={{ color: "rgba(255,255,255,0.45)" }}
                    onMouseEnter={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.08)"); (e.currentTarget.style.color = "white"); }}
                    onMouseLeave={e => { (e.currentTarget.style.background = "transparent"); (e.currentTarget.style.color = "rgba(255,255,255,0.45)"); }}>
                    <Mic className="h-4 w-4" />
                  </button>
                </div>
                <button
                  disabled={!input.trim()}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 0 16px rgba(99,102,241,0.45)" }}
                >
                  <Send className="h-4 w-4 ml-0.5" />
                </button>
              </div>
            </div>
            <p className="text-center mt-2 text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>Pinnbox AI can make mistakes. Check important info.</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-sb::-webkit-scrollbar { width: 3px; }
        .custom-sb::-webkit-scrollbar-track { background: transparent; }
        .custom-sb::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .no-sb::-webkit-scrollbar { display: none; }
        .no-sb { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-fade { -webkit-mask-image: linear-gradient(to right, black 80%, transparent 100%); mask-image: linear-gradient(to right, black 80%, transparent 100%); }
      `}} />
    </div>
  );
}
