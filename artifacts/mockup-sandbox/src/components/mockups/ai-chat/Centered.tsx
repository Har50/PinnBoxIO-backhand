import React, { useState } from "react";
import { Copy, RefreshCw, ThumbsUp, ThumbsDown, Sparkles, ChevronDown, Send, Clock, PenLine, Code, FileText, Image as ImageIcon } from "lucide-react";

export function Centered() {
  const [input, setInput] = useState("");
  
  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#0c051f] via-[#21094e] to-[#0f0426] text-slate-200 font-sans relative overflow-hidden flex justify-center">
      {/* Decorative Orbs */}
      <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none" />

      {/* Centered Column */}
      <div className="w-full max-w-2xl h-screen flex flex-col relative z-10">
        
        {/* Floating Top Bar */}
        <header className="flex items-center justify-between p-4 shrink-0 mt-4">
          <button className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors backdrop-blur-md">
            <Clock className="w-5 h-5" />
          </button>
          
          <button className="px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 flex items-center gap-2 text-sm font-medium text-slate-200 hover:bg-white/[0.08] hover:text-white transition-colors backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-violet-400" />
            GPT-4 Opus
            <ChevronDown className="w-4 h-4 opacity-50" />
          </button>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-32 pt-2 flex flex-col gap-8 scrollbar-hide">
          
          {/* Empty State / Welcome */}
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center mb-6 shadow-2xl backdrop-blur-md">
              <Sparkles className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-3xl font-light text-white mb-3 tracking-tight">Good evening, Alex</h2>
            <p className="text-slate-400 text-sm max-w-sm mb-8">How can I help you be productive today?</p>
            
            <div className="w-full overflow-x-auto scrollbar-hide pb-4">
              <div className="flex items-center justify-center gap-3 min-w-max px-2">
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-sm text-slate-300 transition-colors">
                  <PenLine className="w-4 h-4 text-violet-400" />
                  Draft an email
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-sm text-slate-300 transition-colors">
                  <Code className="w-4 h-4 text-indigo-400" />
                  Review code
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-sm text-slate-300 transition-colors">
                  <FileText className="w-4 h-4 text-blue-400" />
                  Summarize doc
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-sm text-slate-300 transition-colors">
                  <ImageIcon className="w-4 h-4 text-fuchsia-400" />
                  Generate image
                </button>
              </div>
            </div>
          </div>

          {/* User Message */}
          <div className="flex flex-col items-end gap-2">
            <div className="bg-violet-600/20 border border-violet-500/30 text-white px-5 py-3.5 rounded-2xl rounded-tr-sm max-w-[85%] backdrop-blur-md shadow-lg shadow-violet-900/20 leading-relaxed">
              Explain quantum entanglement as if I'm a moderately intelligent golden retriever who understands basic fetch physics.
            </div>
          </div>

          {/* AI Message */}
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-3 ml-1 mb-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/30 border border-white/10 shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-violet-200">Assistant</span>
            </div>
            
            <div className="bg-white/[0.03] border border-white/10 text-slate-200 px-6 py-5 rounded-2xl rounded-tl-sm max-w-[95%] backdrop-blur-md shadow-xl leading-relaxed text-[15px]">
              <p className="mb-4">
                *Woof!* Okay, listen closely. You know when you have two tennis balls, and you leave one inside but bring the other to the park? 
              </p>
              <p className="mb-4">
                Imagine if those two tennis balls were magically linked. Even though one is at home and one is at the park, whatever happens to one *instantly* happens to the other. 
              </p>
              <p>
                If your human paints the park ball blue, the home ball instantly turns blue too. It doesn't matter how far apart they are—they share the same "ball state." That's quantum entanglement. Now go get the ball! 🎾
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-2 ml-12">
              <button className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.08] border border-transparent hover:border-white/10 text-slate-400 hover:text-slate-200 transition-all">
                <Copy className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.08] border border-transparent hover:border-white/10 text-slate-400 hover:text-slate-200 transition-all">
                <RefreshCw className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <button className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.08] border border-transparent hover:border-white/10 text-slate-400 hover:text-slate-200 transition-all">
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.08] border border-transparent hover:border-white/10 text-slate-400 hover:text-slate-200 transition-all">
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Input Area - Pinned to bottom of column */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0c051f] via-[#0c051f]/90 to-transparent pb-8 pt-12">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative bg-[#160b30]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col p-2">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message Assistant..."
                className="w-full bg-transparent text-white placeholder-slate-400 px-3 py-3 resize-none focus:outline-none min-h-[60px] max-h-[200px]"
                rows={1}
              />
              <div className="flex items-center justify-between mt-2 px-2 pb-1">
                <div className="flex items-center gap-1">
                  <button className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <FileText className="w-5 h-5" />
                  </button>
                </div>
                <button 
                  className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${
                    input.length > 0 
                      ? 'bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-600/20' 
                      : 'bg-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </div>
          <div className="text-center mt-4">
            <p className="text-[11px] text-slate-500 font-medium">
              Assistant can make mistakes. Consider verifying important information.
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
}
