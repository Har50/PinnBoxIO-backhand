import React, { useState } from "react";
import {
  LayoutDashboard,
  Mail,
  Sparkles,
  Users,
  MessageCircle,
  Linkedin,
  Search,
  Settings,
  Activity,
  TerminalSquare,
  ChevronRight,
  Filter,
} from "lucide-react";

const RECENT = [
  { name: "Alice J.", preview: "Thanks for the update!", time: "2m", unread: 2, platform: "wa", color: "text-lime-400", border: "border-lime-400/30", bg: "bg-lime-400/10" },
  { name: "Bob S.", preview: "Can we reschedule?", time: "14m", unread: 0, platform: "li", color: "text-blue-400", border: "border-blue-400/30", bg: "bg-blue-400/10" },
  { name: "Carol L.", preview: "Invoice attached ✓", time: "1h", unread: 1, platform: "wa", color: "text-lime-400", border: "border-lime-400/30", bg: "bg-lime-400/10" },
  { name: "David K.", preview: "Q2 numbers look great", time: "3h", unread: 0, platform: "mail", color: "text-cyan-400", border: "border-cyan-400/30", bg: "bg-cyan-400/10" },
];

const KPIS = [
  { label: "UNREAD", value: "14", trend: "+3", color: "text-cyan-400", bg: "bg-cyan-400", border: "border-cyan-400/30", data: [2, 4, 3, 6, 4, 8, 14] },
  { label: "ACTIVE", value: "84", trend: "+12", color: "text-pink-500", bg: "bg-pink-500", border: "border-pink-500/30", data: [60, 65, 70, 68, 75, 80, 84] },
  { label: "WA CHATS", value: "6", trend: "+2", color: "text-lime-400", bg: "bg-lime-400", border: "border-lime-400/30", data: [1, 2, 2, 4, 3, 5, 6] },
  { label: "AI DRFT", value: "32", trend: "+8", color: "text-amber-400", bg: "bg-amber-400", border: "border-amber-400/30", data: [10, 15, 12, 20, 25, 28, 32] },
];

export function DarkCockpit() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const DOCK_ITEMS = [
    { id: "dashboard", icon: LayoutDashboard },
    { id: "inbox", icon: Mail, badge: 3 },
    { id: "ai", icon: Sparkles, isOrb: true },
    { id: "whatsapp", icon: MessageCircle },
    { id: "linkedin", icon: Linkedin },
  ];

  return (
    <div className="w-[390px] h-[844px] bg-[#0b1020] text-slate-300 overflow-hidden flex flex-col rounded-[40px] shadow-2xl border border-slate-800 font-sans relative">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 border-b border-white/5 bg-[#0b1020]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <TerminalSquare className="w-5 h-5 text-cyan-400" />
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-cyan-400/80 tracking-widest leading-none">SYS.OP</span>
            <span className="text-sm font-bold text-white tracking-wide">PINNBOX</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveTab("search")} className={`text-slate-400 hover:text-cyan-400 transition-colors ${activeTab === "search" ? "text-cyan-400" : ""}`}>
            <Search className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTab("contacts")} className={`text-slate-400 hover:text-cyan-400 transition-colors ${activeTab === "contacts" ? "text-cyan-400" : ""}`}>
            <Users className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTab("settings")} className={`text-slate-400 hover:text-cyan-400 transition-colors ${activeTab === "settings" ? "text-cyan-400" : ""}`}>
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        {activeTab === "dashboard" ? (
          <div className="p-4 space-y-4">
            
            {/* Status Header */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
                </span>
                <span className="text-[10px] font-mono text-lime-400 tracking-widest">LIVE STREAM</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">14:02:45 UTC</span>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3">
              {KPIS.map((kpi, i) => (
                <div key={i} className={`bg-[#12182b] p-3 rounded-lg border ${kpi.border} flex flex-col gap-2 relative overflow-hidden group`}>
                  <div className={`absolute -right-4 -top-4 w-16 h-16 ${kpi.bg} opacity-5 blur-xl group-hover:opacity-10 transition-opacity`} />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">{kpi.label}</span>
                    <span className={`text-[10px] font-mono ${kpi.color}`}>{kpi.trend}</span>
                  </div>
                  <div className="flex items-end justify-between mt-1">
                    <span className="text-2xl font-mono text-white leading-none">{kpi.value}</span>
                    
                    <div className="flex items-end gap-0.5 h-6 opacity-70">
                      {kpi.data.map((val, idx) => (
                        <div 
                          key={idx} 
                          className={`w-1 rounded-t-sm ${kpi.bg}`} 
                          style={{ height: `${(val / Math.max(...kpi.data)) * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Channel Mix Chart */}
            <div className="bg-[#12182b] p-4 rounded-lg border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">CHANNELS [7D]</span>
                <Activity className="w-3 h-3 text-slate-500" />
              </div>
              
              <div className="h-24 flex items-end gap-1 w-full pt-4">
                {[
                  { w: 40, l: 30, m: 30 },
                  { w: 50, l: 20, m: 30 },
                  { w: 60, l: 15, m: 25 },
                  { w: 45, l: 35, m: 20 },
                  { w: 70, l: 10, m: 20 },
                  { w: 80, l: 5, m: 15 },
                  { w: 65, l: 25, m: 10 },
                ].map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end gap-0.5 h-full group">
                    <div className="w-full bg-cyan-500/80 rounded-t-sm transition-all group-hover:brightness-125" style={{ height: `${day.m}%` }} />
                    <div className="w-full bg-blue-500/80 transition-all group-hover:brightness-125" style={{ height: `${day.l}%` }} />
                    <div className="w-full bg-lime-500/80 rounded-b-sm transition-all group-hover:brightness-125" style={{ height: `${day.w}%` }} />
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-lime-500 rounded-sm" />
                  <span className="text-[9px] font-mono text-slate-400">WA</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-blue-500 rounded-sm" />
                  <span className="text-[9px] font-mono text-slate-400">LI</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-cyan-500 rounded-sm" />
                  <span className="text-[9px] font-mono text-slate-400">MAIL</span>
                </div>
              </div>
            </div>

            {/* Live Feed */}
            <div className="space-y-2 pb-24">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">COMMS.LOG</span>
                <button className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> FLTR
                </button>
              </div>

              <div className="space-y-2">
                {RECENT.map((msg, i) => (
                  <div key={i} className="bg-[#12182b] border border-white/5 rounded-lg p-3 flex gap-3 hover:border-white/10 transition-colors">
                    <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center font-bold text-xs border ${msg.border} ${msg.color} ${msg.bg}`}>
                      {msg.name[0]}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200 truncate">{msg.name}</span>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-sm bg-white/5 ${msg.color}`}>
                            {msg.platform.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">{msg.time}</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{msg.preview}</p>
                    </div>
                    {msg.unread > 0 && (
                      <div className="flex shrink-0 items-center justify-center">
                        <div className="h-5 min-w-[20px] px-1 rounded-sm bg-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold flex items-center justify-center border border-cyan-500/30">
                          {msg.unread}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4 px-6 pb-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              {activeTab === "inbox" && <Mail className="w-8 h-8 text-cyan-400" />}
              {activeTab === "whatsapp" && <MessageCircle className="w-8 h-8 text-lime-400" />}
              {activeTab === "linkedin" && <Linkedin className="w-8 h-8 text-blue-400" />}
              {activeTab === "search" && <Search className="w-8 h-8 text-slate-300" />}
              {activeTab === "contacts" && <Users className="w-8 h-8 text-pink-500" />}
              {activeTab === "settings" && <Settings className="w-8 h-8 text-slate-300" />}
              {activeTab === "ai" && <Sparkles className="w-8 h-8 text-amber-400" />}
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-mono tracking-widest text-slate-300 uppercase">{activeTab} MODULE</h2>
              <p className="text-xs text-slate-500">System module disconnected or pending authorization. Return to dashboard.</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Dock */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#12182b]/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl flex items-center gap-1 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] z-50">
        {DOCK_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 ${
                activeTab === item.id 
                  ? item.isOrb 
                    ? "bg-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.3)]" 
                    : "bg-white/10 shadow-inner" 
                  : "hover:bg-white/5"
              }`}
            >
              {item.isOrb ? (
                <div className="relative flex items-center justify-center w-full h-full">
                  <div className="absolute inset-2 bg-gradient-to-tr from-amber-500 to-pink-500 rounded-full blur-[2px] opacity-70 animate-pulse" />
                  <div className="absolute inset-2 bg-gradient-to-tr from-amber-400 to-pink-400 rounded-full" />
                  <Icon className="w-4 h-4 text-[#0b1020] relative z-10 drop-shadow-md" />
                </div>
              ) : (
                <Icon className={`w-5 h-5 ${activeTab === item.id ? "text-white" : "text-slate-500"}`} />
              )}
              
              {/* Notification Badge */}
              {item.badge && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              )}
              
              {/* Active Indicator */}
              {activeTab === item.id && !item.isOrb && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/50" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
