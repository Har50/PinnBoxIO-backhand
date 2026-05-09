import React from "react";
import { 
  MessageSquare, Plus, Send, Settings, Sparkles, 
  Mail, Calendar, Clock, RotateCw, CheckCircle2, ChevronRight,
  User, Bot, FileText, Image as ImageIcon, AtSign, Globe, Lock, BrainCircuit
} from "lucide-react";

export function ThreePanel() {
  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-[#0c051f] via-[#21094e] to-[#0f0426] text-white font-sans overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[20%] w-[20%] h-[30%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Left Panel: History Sidebar */}
      <div className="relative w-[240px] flex flex-col border-r border-white/[0.08] bg-white/[0.02] backdrop-blur-md z-10">
        <div className="p-4 border-b border-white/[0.08]">
          <button className="w-full flex items-center justify-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] transition-colors text-sm font-medium py-2.5 rounded-lg border border-white/[0.05]">
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
          <div>
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-2">Today</h3>
            <div className="space-y-1">
              <button className="w-full text-left px-3 py-2 text-sm text-white/90 bg-white/[0.06] rounded-md border border-white/[0.05] truncate">
                Q3 Marketing Campaign Strategy
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.04] rounded-md transition-colors truncate">
                Analyze competitor pricing
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-2">Previous 7 Days</h3>
            <div className="space-y-1">
              <button className="w-full text-left px-3 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.04] rounded-md transition-colors truncate">
                Draft email to investors
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.04] rounded-md transition-colors truncate">
                Weekly sync notes summary
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.04] rounded-md transition-colors truncate">
                Generate SEO keywords
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-white/[0.08] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center text-sm font-bold">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Jane Doe</p>
            <p className="text-xs text-white/50 truncate">Premium Plan</p>
          </div>
          <button className="text-white/40 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Panel: Main Chat */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <div className="h-14 flex items-center px-6 border-b border-white/[0.08] bg-white/[0.01] backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold">Nexus AI</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">PRO</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* User Message */}
          <div className="flex flex-col items-end gap-2 max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-white/40">You</span>
            </div>
            <div className="bg-white/[0.08] border border-white/[0.05] px-5 py-3 rounded-2xl rounded-tr-sm text-sm text-white/90 leading-relaxed shadow-lg">
              Can you draft a quick update for the team based on the Q3 Marketing strategy we discussed, and reference my latest email from Sarah about the budget approval?
            </div>
          </div>

          {/* AI Message */}
          <div className="flex flex-col items-start gap-2 max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Sparkles className="w-3 h-3 text-indigo-300" />
              </div>
              <span className="text-xs font-medium text-indigo-200">Nexus</span>
            </div>
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] px-5 py-4 rounded-2xl rounded-tl-sm text-sm text-white/90 leading-relaxed shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-500 to-indigo-500 opacity-50"></div>
              <p className="mb-4">Here is a draft for the team update, incorporating the Q3 strategy and noting the budget approval from Sarah's recent email:</p>
              
              <div className="bg-black/20 border border-white/5 rounded-lg p-4 font-mono text-xs text-white/80 mb-4 whitespace-pre-wrap">
                Subject: Q3 Marketing Strategy & Budget Update{"\n\n"}
                Hi Team,{"\n\n"}
                Quick update on our Q3 planning. We're officially moving forward with the revised strategy we outlined yesterday, focusing heavily on the new product launch and lifecycle campaigns.{"\n\n"}
                Great news: Sarah just confirmed that the extended budget for Q3 has been approved, which means we can proceed with the targeted ad spend as planned.{"\n\n"}
                Let's sync tomorrow to break down the timeline.
              </div>
              
              <p>Would you like me to adjust the tone or send this directly to your drafts?</p>
              
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.05]">
                <button className="text-xs flex items-center gap-1.5 text-white/50 hover:text-white transition-colors bg-white/5 px-2 py-1 rounded">
                  <RotateCw className="w-3 h-3" /> Retry
                </button>
                <button className="text-xs flex items-center gap-1.5 text-white/50 hover:text-white transition-colors bg-white/5 px-2 py-1 rounded">
                  <CheckCircle2 className="w-3 h-3" /> Copy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-transparent">
          <div className="max-w-3xl mx-auto relative">
            <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.1] shadow-2xl pointer-events-none"></div>
            <div className="relative flex items-end p-2 gap-2">
              <button className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0">
                <Plus className="w-5 h-5" />
              </button>
              <textarea 
                placeholder="Ask anything..." 
                className="w-full bg-transparent text-sm text-white placeholder-white/30 resize-none outline-none py-2.5 max-h-32 custom-scrollbar min-h-[44px]"
                rows={1}
              />
              <button className="p-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/20 shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="text-center mt-2 text-[10px] text-white/30">
            Nexus AI can make mistakes. Verify important information.
          </div>
        </div>
      </div>

      {/* Right Panel: Context Window */}
      <div className="w-[300px] border-l border-white/[0.08] bg-white/[0.01] backdrop-blur-xl flex flex-col z-10">
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.08]">
          <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-violet-400" /> Live Context
          </h2>
          <button className="text-white/40 hover:text-white transition-colors">
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
          
          {/* Section: Connected Accounts */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-medium text-white/40 flex items-center gap-1.5">
              <Globe className="w-3 h-3" /> Connected Accounts
            </h3>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden shadow-inner">
              <div className="px-3 py-2.5 border-b border-white/[0.05] flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-red-500/20 flex items-center justify-center text-red-400">
                    <Mail className="w-3 h-3" />
                  </div>
                  <span className="text-xs text-white/80">j.doe@gmail.com</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
              </div>
              <div className="px-3 py-2.5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Mail className="w-3 h-3" />
                  </div>
                  <span className="text-xs text-white/80">john@acme.com</span>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
              </div>
            </div>
          </div>

          {/* Section: Inbox Summary */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-medium text-white/40 flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> Recent Inbox
            </h3>
            <div className="space-y-1.5">
              {/* Urgent Email */}
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-2.5 pl-3 relative overflow-hidden flex flex-col gap-1 cursor-pointer hover:bg-white/[0.06] transition-colors">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/90">Sarah Chen</span>
                  <span className="text-[10px] text-white/40">10m ago</span>
                </div>
                <span className="text-xs text-white/60 truncate">Re: Q3 Budget Approval - urgent</span>
              </div>
              
              {/* Important Email */}
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-2.5 pl-3 relative overflow-hidden flex flex-col gap-1 cursor-pointer hover:bg-white/[0.06] transition-colors">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/90">Acme Investors</span>
                  <span className="text-[10px] text-white/40">1h ago</span>
                </div>
                <span className="text-xs text-white/60 truncate">Weekly Metrics Report</span>
              </div>

              {/* Read Email */}
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-2.5 pl-3 relative overflow-hidden flex flex-col gap-1 cursor-pointer hover:bg-white/[0.04] transition-colors opacity-75">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/20"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white/70">GitHub</span>
                  <span className="text-[10px] text-white/30">2h ago</span>
                </div>
                <span className="text-xs text-white/50 truncate">Pull Request Merged #442</span>
              </div>
            </div>
          </div>

          {/* Section: Today's Calendar */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-medium text-white/40 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Today's Schedule
            </h3>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden p-1 space-y-1">
              
              {/* Past Event */}
              <div className="flex items-start gap-3 p-2 rounded-lg opacity-50">
                <div className="text-[10px] font-medium text-white/60 mt-0.5 w-8">9:00</div>
                <div className="flex-1">
                  <div className="text-xs text-white/80 line-through">Daily Standup</div>
                  <div className="text-[10px] text-white/40 mt-0.5">30m</div>
                </div>
              </div>
              
              {/* Current Event */}
              <div className="flex items-start gap-3 p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-indigo-400 rounded-r-full shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                <div className="text-[10px] font-bold text-indigo-300 mt-0.5 w-8 text-right pr-1">Now</div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-white">Q3 Strategy Review</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200">1h</span>
                    <div className="flex -space-x-1">
                      <div className="w-3 h-3 rounded-full bg-blue-400 border border-indigo-900"></div>
                      <div className="w-3 h-3 rounded-full bg-pink-400 border border-indigo-900"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Future Event */}
              <div className="flex items-start gap-3 p-2 rounded-lg">
                <div className="text-[10px] font-medium text-white/60 mt-0.5 w-8">14:00</div>
                <div className="flex-1">
                  <div className="text-xs text-white/80">Investor Call prep</div>
                  <div className="text-[10px] text-white/40 mt-0.5">45m</div>
                </div>
              </div>

            </div>
          </div>

          {/* Section: Model Switcher */}
          <div className="space-y-2 mt-auto pt-4 border-t border-white/[0.08]">
            <h3 className="text-[11px] font-medium text-white/40 flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Active Model
            </h3>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 flex flex-col gap-1">
              <button className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.08] shadow-sm border border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 flex items-center justify-center"></div>
                  <span className="text-xs font-medium text-white/90">GPT-4o</span>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-white/80"></div>
              </button>
              <button className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-orange-400 to-red-400 flex items-center justify-center opacity-50"></div>
                  <span className="text-xs font-medium text-white/50">Claude 3.5 Sonnet</span>
                </div>
              </button>
              <button className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 flex items-center justify-center opacity-50"></div>
                  <span className="text-xs font-medium text-white/50">Gemini 1.5 Pro</span>
                </div>
              </button>
            </div>
          </div>

        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}
