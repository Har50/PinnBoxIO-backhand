import React, { useState } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Mic, 
  Paperclip, 
  Sparkles, 
  Settings, 
  Search,
  Command,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';

export function Premium() {
  const [model, setModel] = useState('gpt-4o');

  const history = [
    { id: 1, title: 'Draft investor update', time: '2h ago' },
    { id: 2, title: 'Review Q3 marketing budget', time: 'Yesterday' },
    { id: 3, title: 'Summarize Sarah\'s emails', time: 'Yesterday' },
    { id: 4, title: 'Schedule sync with engineering', time: 'Tue' },
    { id: 5, title: 'Brainstorm product names', time: 'Mon' },
  ];

  const suggestedPrompts = [
    "Summarize my unread emails from today",
    "Find available times for a team sync next week",
    "Draft a reply to the last email from John",
    "Extract action items from yesterday's meeting notes"
  ];

  return (
    <div className="w-[1280px] h-[800px] overflow-hidden bg-[#0c051f] bg-gradient-to-br from-[#0c051f] via-[#21094e] to-[#0f0426] text-white flex font-sans relative antialiased shadow-2xl">
      {/* Noise Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
      ></div>

      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[50%] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Sidebar */}
      <div className="w-[280px] flex-shrink-0 flex flex-col bg-white/[0.02] backdrop-blur-2xl border-r border-white/[0.08] relative z-10">
        <div className="p-4 pt-6">
          <button className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 transition-colors border border-white/10 rounded-xl py-3 px-4 text-sm font-medium shadow-lg backdrop-blur-sm group">
            <Plus size={16} className="text-violet-300 group-hover:rotate-90 transition-transform duration-300" />
            New Conversation
            <div className="ml-auto flex gap-1 opacity-50">
              <Command size={12} />
              <span className="text-xs">N</span>
            </div>
          </button>
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
              type="text" 
              placeholder="Search history..." 
              className="w-full bg-white/5 border border-white/5 rounded-lg py-1.5 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-violet-500/50 focus:bg-white/10 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1 custom-scrollbar">
          <div className="text-xs font-semibold text-white/30 px-2 pt-2 pb-1 uppercase tracking-wider">Today</div>
          <button className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg bg-white/10 border border-white/5 text-left group transition-all">
            <MessageSquare size={16} className="text-violet-400" />
            <div className="flex-1 truncate">
              <div className="text-sm font-medium text-white truncate">Q4 Planning & Emails</div>
              <div className="text-xs text-violet-200/50">Just now</div>
            </div>
          </button>

          <div className="text-xs font-semibold text-white/30 px-2 pt-4 pb-1 uppercase tracking-wider">Previous 7 Days</div>
          {history.map((item) => (
            <button key={item.id} className="w-full flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-white/5 text-left group transition-all">
              <MessageSquare size={16} className="text-white/30 group-hover:text-white/60 transition-colors" />
              <div className="flex-1 truncate">
                <div className="text-sm font-medium text-white/80 group-hover:text-white truncate transition-colors">{item.title}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/[0.05] mt-auto">
          <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 p-[1px]">
              <div className="w-full h-full rounded-full bg-[#1a0f30] flex items-center justify-center">
                <span className="text-xs font-medium">JD</span>
              </div>
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">John Doe</div>
              <div className="text-xs text-white/40">Premium Plan</div>
            </div>
            <Settings size={16} className="text-white/40" />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/[0.05] bg-white/[0.01] backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide flex items-center gap-2">
                Pinnbox Assistant
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-violet-300 border border-violet-500/30">PRO</span>
              </h1>
            </div>
          </div>

          {/* Model Switcher */}
          <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
            {['gpt-4o', 'claude', 'gemini'].map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 relative ${
                  model === m 
                    ? 'text-white shadow-[0_2px_10px_rgba(0,0,0,0.2)]' 
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                {model === m && (
                  <div className="absolute inset-0 bg-white/15 border border-white/20 rounded-lg shadow-[0_0_10px_rgba(255,255,255,0.1)]"></div>
                )}
                <span className="relative z-10">{
                  m === 'gpt-4o' ? 'GPT-4o' : 
                  m === 'claude' ? 'Claude 3.5' : 'Gemini 1.5'
                }</span>
              </button>
            ))}
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-36 custom-scrollbar scroll-smooth">
          
          {/* AI Intro / Welcome */}
          <div className="flex flex-col items-center justify-center text-center mt-10 mb-12 opacity-80">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(139,92,246,0.15)]">
              <Sparkles size={28} className="text-violet-300" />
            </div>
            <h2 className="text-2xl font-light tracking-tight mb-2">Good morning, John</h2>
            <p className="text-white/50 text-sm max-w-md">I've synced with your inbox and calendar. What would you like to focus on today?</p>
          </div>

          {/* Example User Message */}
          <div className="flex justify-end">
            <div className="max-w-[75%] bg-gradient-to-br from-violet-600 to-indigo-600 p-4 rounded-2xl rounded-tr-sm shadow-[0_5px_25px_rgba(109,40,217,0.3)] border border-white/10 relative group">
              <p className="text-[15px] leading-relaxed">
                Can you summarize any urgent emails I received overnight? And do I have any conflicts for a 2PM meeting?
              </p>
            </div>
          </div>

          {/* Example AI Message */}
          <div className="flex justify-start">
            <div className="max-w-[80%] flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.3)] border border-white/20 mt-1">
                <Sparkles size={14} className="text-white" />
              </div>
              
              <div className="bg-white/[0.04] backdrop-blur-xl p-5 rounded-2xl rounded-tl-sm border border-white/[0.15] shadow-[0_8px_32px_rgba(0,0,0,0.2)] relative group">
                <div className="absolute inset-0 rounded-2xl rounded-tl-sm bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none"></div>
                <div className="absolute inset-0 rounded-2xl rounded-tl-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none"></div>
                
                <div className="relative z-10 text-[15px] leading-relaxed text-white/90 space-y-4">
                  <p>You have <strong className="text-white font-medium">3 urgent emails</strong> that need your attention:</p>
                  
                  <div className="flex flex-col gap-2">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3 cursor-pointer hover:bg-white/10 transition-colors">
                      <div className="w-1 bg-red-400 rounded-full shrink-0"></div>
                      <div>
                        <div className="text-sm font-medium text-white">Sarah Jenkins • Product Launch</div>
                        <div className="text-xs text-white/60 mt-0.5 line-clamp-1">We need approval on the final copy before 12 PM EST.</div>
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-3 cursor-pointer hover:bg-white/10 transition-colors">
                      <div className="w-1 bg-amber-400 rounded-full shrink-0"></div>
                      <div>
                        <div className="text-sm font-medium text-white">AWS Billing • High Usage Alert</div>
                        <div className="text-xs text-white/60 mt-0.5 line-clamp-1">Your projected spend for this month is 40% higher than usual.</div>
                      </div>
                    </div>
                  </div>

                  <p>Regarding your calendar, you are <strong>free at 2:00 PM</strong>. Your next meeting is at 3:30 PM with the Design Team. Would you like me to schedule something for 2 PM?</p>
                </div>
                
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                  <button className="text-xs text-white/40 hover:text-white flex items-center gap-1.5 transition-colors bg-white/5 px-2 py-1 rounded hover:bg-white/10">
                    <Sparkles size={12} /> Draft reply to Sarah
                  </button>
                  <button className="text-xs text-white/40 hover:text-white flex items-center gap-1.5 transition-colors bg-white/5 px-2 py-1 rounded hover:bg-white/10">
                    Create 2PM event
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pt-10 bg-gradient-to-t from-[#0c051f] via-[#0c051f]/80 to-transparent pointer-events-none">
          <div className="max-w-3xl mx-auto w-full relative pointer-events-auto">
            
            {/* Suggested Chips (floating above input) */}
            <div className="absolute -top-12 left-0 right-0 flex gap-2 overflow-x-auto no-scrollbar pb-2 mask-linear-fade">
              {suggestedPrompts.slice(0,3).map((prompt, i) => (
                <button key={i} className="whitespace-nowrap px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 hover:text-white backdrop-blur-md transition-all transform hover:-translate-y-0.5 shadow-lg">
                  {prompt}
                </button>
              ))}
            </div>

            {/* Main Input Box */}
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[28px] p-2 shadow-[0_10px_40px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col transition-all focus-within:bg-white/[0.12] focus-within:border-white/30 focus-within:shadow-[0_10px_40px_rgba(139,92,246,0.15),inset_0_1px_1px_rgba(255,255,255,0.1)] relative group">
              
              {/* Subtle inner glow */}
              <div className="absolute inset-0 rounded-[28px] shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] pointer-events-none"></div>

              <textarea 
                placeholder="Ask about your emails, schedule, or contacts..." 
                className="w-full bg-transparent border-none resize-none outline-none text-[15px] text-white placeholder:text-white/40 px-4 pt-3 pb-2 min-h-[44px] max-h-[150px] overflow-y-auto custom-scrollbar"
                rows={1}
              />
              
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-1">
                  <button className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors tooltip-trigger relative">
                    <Plus size={20} />
                  </button>
                  <button className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                    <Paperclip size={18} />
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                    <Mic size={18} />
                  </button>
                  <button className="w-9 h-9 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 flex items-center justify-center text-white hover:shadow-[0_0_15px_rgba(139,92,246,0.6)] transition-all hover:scale-105 active:scale-95">
                    <Send size={16} className="ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-3">
              <span className="text-[10px] text-white/30">Pinnbox AI can make mistakes. Check important info.</span>
            </div>

          </div>
        </div>

      </div>

      {/* Internal CSS for custom scrollbar and mask */}
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
        .mask-linear-fade {
          -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
          mask-image: linear-gradient(to right, black 85%, transparent 100%);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
