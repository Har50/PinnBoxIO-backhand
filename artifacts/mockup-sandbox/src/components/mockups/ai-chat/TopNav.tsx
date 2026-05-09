import React, { useState } from "react";
import { 
  Sparkles, 
  ChevronDown, 
  Settings, 
  Send, 
  Mic, 
  Paperclip, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  ArrowRight,
  Bot
} from "lucide-react";

export function TopNav() {
  const [hasStarted, setHasStarted] = useState(true);

  return (
    <div className="flex flex-col h-screen w-full bg-[#0c051f] bg-gradient-to-br from-[#0c051f] via-[#21094e] to-[#0f0426] text-white overflow-hidden relative font-sans">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-white/[0.08] bg-white/[0.02] backdrop-blur-md z-10 relative">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium tracking-wide">Pinnbox Assistant</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 tracking-wider">PRO</span>
        </div>

        {/* Center: History Button */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.05] transition-colors text-sm text-white/80">
            Recent Chats <ChevronDown className="w-4 h-4 opacity-50" />
          </button>
        </div>

        {/* Right: Model Switcher & Settings */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-full bg-white/[0.05] border border-white/[0.05]">
            <button className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium shadow-sm transition-all">GPT-4o</button>
            <button className="px-3 py-1 rounded-full text-white/60 hover:text-white text-xs font-medium transition-all">Claude</button>
            <button className="px-3 py-1 rounded-full text-white/60 hover:text-white text-xs font-medium transition-all">Gemini</button>
          </div>
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/[0.08] transition-colors text-white/70 hover:text-white">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-0 pb-32 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className="max-w-3xl mx-auto w-full px-4 pt-8 pb-12 flex flex-col gap-8">
          
          {!hasStarted ? (
            <div className="flex flex-col items-center justify-center mt-20">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
                <Sparkles className="w-8 h-8 text-violet-300" />
              </div>
              <h1 className="text-3xl font-light mb-2">Good morning, Alex</h1>
              <p className="text-white/50 mb-12">How can I help you be productive today?</p>
              
              <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                <button className="flex flex-col items-start text-left p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-all group">
                  <Mail className="w-5 h-5 text-violet-400 mb-3 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-sm mb-1">Draft client email</span>
                  <span className="text-xs text-white/40">Follow up on the Q3 proposal</span>
                </button>
                <button className="flex flex-col items-start text-left p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-all group">
                  <Calendar className="w-5 h-5 text-fuchsia-400 mb-3 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-sm mb-1">Schedule sync</span>
                  <span className="text-xs text-white/40">Find time with the design team</span>
                </button>
                <button className="flex flex-col items-start text-left p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-all group">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-3 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-sm mb-1">Summarize notes</span>
                  <span className="text-xs text-white/40">Extract action items from yesterday</span>
                </button>
                <button className="flex flex-col items-start text-left p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-all group">
                  <Bot className="w-5 h-5 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-sm mb-1">Brainstorm ideas</span>
                  <span className="text-xs text-white/40">For the upcoming marketing campaign</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* User Message */}
              <div className="flex flex-col items-end gap-2">
                <div className="bg-white/[0.08] backdrop-blur-sm border border-white/[0.05] px-5 py-3.5 rounded-2xl rounded-tr-sm max-w-[85%] text-[15px] leading-relaxed shadow-lg">
                  Can you draft an email to Sarah summarizing our Q3 sync? Mention the 15% growth and the new marketing push.
                </div>
              </div>

              {/* AI Message */}
              <div className="flex flex-col items-start gap-3 w-full">
                <div className="flex items-center gap-3 ml-1 mb-1">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-white/90">Pinnbox</span>
                </div>
                
                <div className="text-[15px] text-white/90 leading-relaxed max-w-[90%] pl-9">
                  <p className="mb-4">Here's a draft summarizing the Q3 sync with Sarah. I've highlighted the 15% growth and the upcoming marketing initiatives as requested.</p>
                  
                  {/* Email Card Component from Premium */}
                  <div className="w-full bg-[#150a30]/80 backdrop-blur-md border border-white/[0.08] rounded-xl overflow-hidden mb-5 shadow-xl">
                    <div className="px-4 py-3 border-b border-white/[0.05] bg-white/[0.02] flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-medium text-sm">
                        S
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">Sarah Jenkins</div>
                        <div className="text-xs text-white/40 truncate">Subject: Q3 Sync Summary & Next Steps</div>
                      </div>
                    </div>
                    <div className="p-4 text-sm text-white/80 leading-relaxed font-light">
                      <p className="mb-3">Hi Sarah,</p>
                      <p className="mb-3">Great catching up earlier. I wanted to quickly summarize our Q3 sync to ensure we're aligned on the next steps.</p>
                      <p className="mb-3">Key highlights:</p>
                      <ul className="list-disc pl-5 mb-3 space-y-1">
                        <li><span className="text-white">Q3 Performance:</span> We hit our targets with a solid <strong>15% quarter-over-quarter growth</strong>.</li>
                        <li><span className="text-white">Marketing Push:</span> The new campaign kicks off next month. We need the final assets from design by Friday.</li>
                      </ul>
                      <p className="mb-3">Let me know if I missed anything or if you have any questions before we proceed.</p>
                      <p>Best,<br/>Alex</p>
                    </div>
                    <div className="px-4 py-2 border-t border-white/[0.05] bg-white/[0.01] flex justify-end gap-2">
                      <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors">
                        Edit Draft
                      </button>
                      <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors flex items-center gap-1.5 shadow-[0_0_10px_rgba(124,58,237,0.3)]">
                        <Send className="w-3 h-3" /> Send Email
                      </button>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-xs flex items-center gap-1.5 transition-all text-white/70 hover:text-white">
                      <Bot className="w-3 h-3" /> Make it more formal
                    </button>
                    <button className="px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-xs flex items-center gap-1.5 transition-all text-white/70 hover:text-white">
                      <ArrowRight className="w-3 h-3" /> Make it shorter
                    </button>
                    <button className="px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-xs flex items-center gap-1.5 transition-all text-white/70 hover:text-white">
                      <Calendar className="w-3 h-3" /> Add a meeting link
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
          
        </div>
      </main>

      {/* Input Area (Pinned to bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0c051f] via-[#0c051f]/90 to-transparent pointer-events-none z-20">
        <div className="max-w-3xl mx-auto w-full pointer-events-auto">
          <div className="relative group">
            {/* Glow effect behind input */}
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 rounded-[2rem] blur-md opacity-50 group-focus-within:opacity-100 transition-opacity duration-500" />
            
            <div className="relative flex items-end gap-2 bg-[#1a0b3b]/90 backdrop-blur-xl border border-white/10 rounded-[1.75rem] p-2 shadow-2xl transition-all duration-300">
              <button className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all shrink-0">
                <Paperclip className="w-5 h-5" />
              </button>
              
              <div className="flex-1 min-h-[44px] max-h-32 overflow-y-auto py-3 px-1">
                <textarea 
                  placeholder="Message Pinnbox Assistant..." 
                  className="w-full bg-transparent border-none outline-none resize-none text-[15px] placeholder:text-white/30 text-white scrollbar-none"
                  rows={1}
                />
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                <button className="p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all">
                  <Mic className="w-5 h-5" />
                </button>
                <button className="p-3 bg-white text-indigo-950 rounded-full hover:bg-violet-100 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="text-center mt-3 text-[10px] text-white/30 font-medium tracking-wide">
              AI CAN MAKE MISTAKES. VERIFY IMPORTANT INFORMATION.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
