import React, { useState } from 'react';
import { Sparkles, Mail, Users, Settings, Mic, MessageCircle, Linkedin, ChevronDown, CheckCircle2, Search, Zap } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'ai', icon: Sparkles, label: 'Assistant' },
  { id: 'inbox', icon: Mail, label: 'Inbox', badge: 3 },
  { id: 'contacts', icon: Users, label: 'Contacts' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

const CHANNELS = [
  { id: 'all', label: 'All Channels' },
  { id: 'email', label: 'Email' },
  { id: 'wa', label: 'WhatsApp' },
  { id: 'li', label: 'LinkedIn' },
];

export function AiFirst() {
  const [activeTab, setActiveTab] = useState('ai');
  const [activeChannel, setActiveChannel] = useState('all');
  const [showChannels, setShowChannels] = useState(false);

  return (
    <div className="w-[390px] h-[844px] overflow-hidden flex flex-col rounded-[40px] shadow-2xl border border-slate-200 bg-[#F8F8FC] relative font-sans text-slate-900">
      {/* Background ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-violet-400/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[250px] h-[250px] bg-indigo-400/10 rounded-full blur-[60px] pointer-events-none" />

      {/* Top Header / Channel Switcher */}
      <div className="pt-14 pb-2 px-4 flex justify-center z-10 relative">
        <button 
          onClick={() => setShowChannels(!showChannels)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/80 shadow-sm text-sm font-medium text-slate-700"
        >
          {CHANNELS.find(c => c.id === activeChannel)?.label}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showChannels ? 'rotate-180' : ''}`} />
        </button>

        {showChannels && (
          <div className="absolute top-full mt-2 w-48 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white p-1.5 z-50">
            {CHANNELS.map(c => (
              <button
                key={c.id}
                onClick={() => { setActiveChannel(c.id); setShowChannels(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-colors ${activeChannel === c.id ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {c.label}
                {activeChannel === c.id && <CheckCircle2 className="w-4 h-4" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32 z-10 no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {activeTab === 'ai' ? (
          <div className="flex flex-col gap-6">
            
            {/* AI Greeting */}
            <div className="flex flex-col items-center mt-4 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 p-[2px] shadow-lg shadow-violet-500/30 mb-4 relative">
                 <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-violet-600" />
                 </div>
                 <div className="absolute top-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 text-center tracking-tight">Good morning.</h1>
              <p className="text-slate-500 text-sm mt-1 text-center">You have 3 unread threads requiring attention.</p>
            </div>

            {/* Morning Briefing Cards */}
            <div className="space-y-3">
              {/* Card 1 */}
              <div className="bg-white/70 backdrop-blur-md rounded-3xl p-4 shadow-sm border border-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">WhatsApp • 2m ago</span>
                  </div>
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">2</div>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-200 to-red-200 flex items-center justify-center text-orange-700 font-bold text-sm">
                    AJ
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Alice J.</h3>
                    <p className="text-sm text-slate-600 line-clamp-1">"Thanks for the update! When is the next milestone?"</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 py-2 px-3 rounded-xl bg-violet-600 text-white text-sm font-medium flex items-center justify-center gap-1.5 shadow-sm shadow-violet-600/20 hover:bg-violet-700 transition-colors">
                    <Zap className="w-4 h-4" /> Draft Reply
                  </button>
                  <button className="py-2 px-4 rounded-xl bg-slate-100/50 hover:bg-slate-100 text-slate-700 text-sm font-medium transition-colors">
                    Dismiss
                  </button>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-white/70 backdrop-blur-md rounded-3xl p-4 shadow-sm border border-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">LinkedIn • 14m ago</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-200 to-cyan-200 flex items-center justify-center text-blue-700 font-bold text-sm">
                    BS
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Bob S.</h3>
                    <p className="text-sm text-slate-600 line-clamp-1">"Can we reschedule? I have a conflict at 3."</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="flex-1 py-2 px-3 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors">
                    <Zap className="w-4 h-4" /> Propose Times
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions (Floating bubbles) */}
            <div className="flex flex-wrap gap-2 mt-2">
              <button className="px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm hover:bg-white border border-white text-sm text-slate-600 shadow-sm flex items-center gap-2 transition-colors">
                Summarize Carol's thread
              </button>
              <button className="px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm hover:bg-white border border-white text-sm text-slate-600 shadow-sm flex items-center gap-2 transition-colors">
                Show Q2 numbers from David
              </button>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center h-full text-slate-400 mt-20">
            {(() => {
              const Icon = NAV_ITEMS.find(n => n.id === activeTab)?.icon || Search;
              return <Icon className="w-12 h-12 mb-4 opacity-50" />;
            })()}
            <p className="text-lg font-medium text-slate-600 mb-1">{NAV_ITEMS.find(n => n.id === activeTab)?.label}</p>
            <p className="text-sm text-center px-8">This view is managed by the AI. Ask the assistant to find what you need.</p>
          </div>
        )}
      </div>

      {/* Input & Bottom Nav Area */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        {/* Gradient fade to hide scroll */}
        <div className="absolute bottom-full left-0 right-0 h-8 bg-gradient-to-t from-[#F8F8FC] to-transparent pointer-events-none" />
        
        <div className="bg-[#F8F8FC]/90 backdrop-blur-xl border-t border-white/50 pt-2 pb-6 px-4">
          
          {/* Input Bar */}
          {activeTab === 'ai' && (
            <div className="relative mb-4 flex items-center">
              <div className="absolute left-4 w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_8px_3px_rgba(139,92,246,0.4)] animate-pulse" />
              <input 
                type="text" 
                placeholder="Ask me anything..." 
                className="w-full bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-full py-3.5 pl-10 pr-12 text-[15px] shadow-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 transition-all placeholder:text-slate-400"
              />
              <button className="absolute right-2 p-2 rounded-full bg-violet-600 text-white shadow-sm hover:bg-violet-700 transition-colors">
                <Mic className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bottom Nav */}
          <div className="flex justify-between items-center px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="relative flex flex-col items-center gap-1 p-2 min-w-[64px]"
                >
                  <div className={`relative flex items-center justify-center w-12 h-8 rounded-full transition-all duration-300 ${isActive ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'fill-violet-100' : ''}`} />
                    {item.badge && (
                      <span className="absolute top-0 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#F8F8FC]" />
                    )}
                  </div>
                  <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-violet-800' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
