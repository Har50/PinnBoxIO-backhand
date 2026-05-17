import React, { useState } from "react";
import {
  Brain,
  List,
  Plus,
  Send,
  Mic,
  Globe,
  Mail,
  Reply,
  Languages,
  CalendarSearch,
  FileText,
  PenLine,
  Cpu,
} from "lucide-react";

const SUGGESTIONS = [
  { icon: Mail,           text: "Summarize my unread emails" },
  { icon: Reply,          text: "Draft a reply to my latest email" },
  { icon: Languages,      text: "Translate this to English" },
  { icon: CalendarSearch, text: "What emails did I get today?" },
  { icon: FileText,       text: "Read my latest PDF from storage" },
  { icon: PenLine,        text: "Write a professional email for me" },
];

const SAMPLE_MESSAGES = [
  { role: "user" as const, content: "Summarize my unread emails" },
  {
    role: "assistant" as const,
    content:
      "Here's a summary of your 4 unread emails:\n\n• Sarah from Design sent the updated Figma mockups for review — deadline is Friday.\n• Your AWS bill is ready ($84.20 for October).\n• LinkedIn: 3 new connection requests.\n• James is asking about the Q4 budget meeting — wants to schedule for next Tuesday.\n\nWould you like me to draft a reply to any of these?",
  },
];

type View = "empty" | "chat";

export function Redesigned() {
  const [view, setView] = useState<View>("empty");
  const [input, setInput] = useState("");

  const primary = "#3b82f6";
  const bg = "#0f172a";
  const card = "#1e293b";
  const border = "#334155";
  const fg = "#f1f5f9";
  const muted = "#94a3b8";
  const primaryBg = "#3b82f620";

  return (
    <div
      className="flex flex-col h-[100dvh] w-full overflow-hidden"
      style={{ backgroundColor: bg, color: fg, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Status bar mock */}
      <div className="flex items-center justify-between px-5 pt-3 pb-1 text-[11px] font-semibold" style={{ color: fg }}>
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <svg width="16" height="10" viewBox="0 0 16 10" fill="none"><rect x="0" y="3" width="3" height="7" rx="0.8" fill={fg} opacity="0.4"/><rect x="4.5" y="2" width="3" height="8" rx="0.8" fill={fg} opacity="0.6"/><rect x="9" y="0.5" width="3" height="9.5" rx="0.8" fill={fg}/><rect x="13.5" y="1" width="2" height="8" rx="0.6" fill={fg} opacity="0.3"/></svg>
          <svg width="15" height="11" viewBox="0 0 15 11" fill={fg}><path d="M7.5 2.2C9.8 2.2 11.9 3.1 13.4 4.6L14.8 3.2C12.9 1.2 10.3 0 7.5 0S2.1 1.2 0.2 3.2L1.6 4.6C3.1 3.1 5.2 2.2 7.5 2.2Z" opacity="0.4"/><path d="M7.5 4.8C9.1 4.8 10.5 5.4 11.6 6.5L13 5.1C11.5 3.6 9.6 2.7 7.5 2.7S3.5 3.6 2 5.1L3.4 6.5C4.5 5.4 5.9 4.8 7.5 4.8Z" opacity="0.7"/><path d="M7.5 7.4C8.4 7.4 9.2 7.8 9.8 8.4L7.5 11L5.2 8.4C5.8 7.8 6.6 7.4 7.5 7.4Z"/></svg>
          <div className="flex items-center gap-0.5">
            <div className="rounded-sm" style={{ width: 22, height: 11, border: `1.5px solid ${fg}`, padding: 1.5, display:'flex', alignItems:'center' }}>
              <div className="rounded-sm h-full" style={{ width: '75%', backgroundColor: fg }} />
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-3"
        style={{ borderBottom: `1px solid ${border}` }}
      >
        <button
          className="flex items-center justify-center rounded-[10px] flex-shrink-0"
          style={{ width: 36, height: 36, backgroundColor: primaryBg }}
        >
          <List size={20} color={primary} />
        </button>

        {/* ✅ Clean lucide Brain icon — same as webapp */}
        <button
          className="flex items-center justify-center rounded-[10px] flex-shrink-0"
          style={{ width: 36, height: 36, backgroundColor: primaryBg }}
        >
          <Brain size={18} color={primary} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold truncate" style={{ color: fg }}>
            AI Assistant
          </div>
          <div className="text-[11px]" style={{ color: muted, marginTop: 1 }}>
            Context-aware help for your inbox
          </div>
        </div>

        <button
          className="flex items-center justify-center rounded-[10px] flex-shrink-0"
          style={{ width: 32, height: 32, backgroundColor: primaryBg }}
        >
          <Plus size={15} color={primary} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {view === "empty" ? (
          <div className="flex flex-col items-center justify-center h-full px-5 pb-6">
            {/* ✅ Clean lucide Brain in empty state */}
            <div
              className="flex items-center justify-center rounded-[18px] mb-4"
              style={{ width: 64, height: 64, backgroundColor: primaryBg }}
            >
              <Brain size={32} color={primary} strokeWidth={1.5} />
            </div>

            <div className="text-[18px] font-bold text-center mb-2" style={{ color: fg }}>
              Hello! I'm your AI assistant.
            </div>
            <div className="text-[14px] text-center leading-[21px] mb-6" style={{ color: muted }}>
              I can summarize emails, draft replies, find contacts, and help you
              manage all your communications smarter.
            </div>

            {/* ✅ Suggestion chips with icons */}
            <div className="w-full flex flex-col gap-2">
              {SUGGESTIONS.map(({ icon: Icon, text }) => (
                <button
                  key={text}
                  onClick={() => { setInput(text); setView("chat"); }}
                  className="flex items-center gap-3 text-left px-4 py-3 rounded-[12px] transition-all active:scale-[0.98]"
                  style={{
                    backgroundColor: card,
                    border: `1px solid ${border}`,
                    color: fg,
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-[8px] flex-shrink-0"
                    style={{ width: 30, height: 30, backgroundColor: primaryBg }}
                  >
                    <Icon size={14} color={primary} />
                  </div>
                  <span className="text-[14px]">{text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 p-4">
            {SAMPLE_MESSAGES.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div
                    className="text-[15px] leading-[22px] max-w-[82%] px-3.5 py-2.5 rounded-[18px] rounded-br-[5px]"
                    style={{ backgroundColor: primary, color: "#fff" }}
                  >
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-start gap-2">
                  <div
                    className="flex items-center justify-center rounded-[8px] flex-shrink-0 mt-0.5"
                    style={{ width: 24, height: 24, backgroundColor: primaryBg }}
                  >
                    {/* ✅ Clean Brain in chat bubble avatar too */}
                    <Brain size={11} color={primary} strokeWidth={1.8} />
                  </div>
                  <div
                    className="text-[15px] leading-[22px] max-w-[82%] px-3.5 py-2.5 rounded-[18px] rounded-bl-[5px] whitespace-pre-wrap"
                    style={{
                      backgroundColor: card,
                      border: `1px solid ${border}`,
                      color: fg,
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div
        className="flex items-end gap-2 px-3 py-2.5"
        style={{ borderTop: `1px solid ${border}` }}
      >
        <button className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 36, height: 36 }}>
          <Plus size={18} color={muted} />
        </button>
        <button className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 36, height: 36 }}>
          <Globe size={18} color={muted} />
        </button>
        <button className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 36, height: 36 }}>
          <Mic size={18} color={muted} />
        </button>

        <input
          className="flex-1 rounded-[22px] px-4 py-2.5 text-[15px] outline-none"
          style={{
            backgroundColor: card,
            border: `1px solid ${border}`,
            color: fg,
          }}
          placeholder="Ask anything about your communications…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) setView("chat"); }}
        />

        <button
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{
            width: 42, height: 42,
            backgroundColor: input.trim() ? primary : "#1e293b",
            border: `1px solid ${input.trim() ? primary : border}`,
          }}
          onClick={() => { if (input.trim()) setView("chat"); }}
        >
          <Send size={16} color={input.trim() ? "#fff" : muted} />
        </button>
      </div>

      {/* Home indicator */}
      <div className="flex justify-center pb-2 pt-1">
        <div className="rounded-full" style={{ width: 130, height: 5, backgroundColor: fg, opacity: 0.15 }} />
      </div>
    </div>
  );
}
