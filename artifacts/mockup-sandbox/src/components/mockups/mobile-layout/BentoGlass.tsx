import React, { useState } from "react";
import {
  LayoutDashboard, Mail, Users, Search, MessageCircle,
  Settings, Sparkles, Linkedin, Plus, TrendingUp,
  ArrowUpRight, ChevronRight, Menu
} from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Home", id: "dashboard" },
  { icon: Mail, label: "Inbox", badge: 3, id: "inbox" },
  { icon: Sparkles, label: "AI Assist", id: "ai" },
  { icon: Menu, label: "Menu", id: "menu" },
];

const MENU_ITEMS = [
  { icon: Users, label: "Contacts", id: "contacts", color: "text-blue-500", bg: "bg-blue-100" },
  { icon: MessageCircle, label: "WhatsApp", id: "whatsapp", color: "text-green-500", bg: "bg-green-100" },
  { icon: Linkedin, label: "LinkedIn", id: "linkedin", color: "text-[#0A66C2]", bg: "bg-blue-50" },
  { icon: Search, label: "Search", id: "search", color: "text-gray-600", bg: "bg-gray-100" },
  { icon: Settings, label: "Settings", id: "settings", color: "text-gray-600", bg: "bg-gray-100" },
];

const RECENT = [
  { name: "Alice J.", preview: "Thanks for the update!", time: "2m", unread: 2, platform: "wa", color: "bg-green-500" },
  { name: "Bob S.", preview: "Can we reschedule?", time: "14m", unread: 0, platform: "li", color: "bg-[#0A66C2]" },
  { name: "Carol L.", preview: "Invoice attached ✓", time: "1h", unread: 1, platform: "wa", color: "bg-green-500" },
  { name: "David K.", preview: "Q2 numbers look great", time: "3h", unread: 0, platform: "email", color: "bg-orange-500" },
];

export function BentoGlass() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="w-[390px] h-[844px] overflow-hidden flex flex-col rounded-[40px] shadow-2xl border border-gray-200 bg-[#F2F2F7] font-sans relative">
      
      {/* Header (Glass) */}
      <div className="h-24 pt-12 px-6 flex items-center justify-between bg-white/40 backdrop-blur-xl border-b border-white/50 sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Good morning</h1>
          <p className="text-xs font-medium text-gray-500">Wednesday, Oct 25</p>
        </div>
        <button className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-100 to-white shadow-sm border border-white flex items-center justify-center overflow-hidden">
          <span className="text-sm font-bold text-gray-700">PJ</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-4 hide-scrollbar">
        {activeTab === "dashboard" ? (
          <div className="grid grid-cols-2 gap-3">
            
            {/* Wide Stat Tile: Unread */}
            <button onClick={() => setActiveTab("inbox")} className="col-span-2 rounded-[32px] bg-white/60 backdrop-blur-xl border border-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-left hover:scale-[0.98] transition-transform">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-500" />
                </div>
                <div className="px-3 py-1 bg-white/80 rounded-full border border-white shadow-sm flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-blue-500" />
                  <span className="text-[10px] font-semibold text-blue-600">3 new</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-[40px] leading-none font-semibold tracking-tight text-gray-900">12</div>
                <div className="text-[13px] font-medium text-gray-500 mt-1">Unread messages</div>
              </div>
            </button>

            {/* 1-Col Stat: AI Replies */}
            <button onClick={() => setActiveTab("ai")} className="col-span-1 rounded-[32px] bg-gradient-to-br from-amber-100/80 to-orange-50/80 backdrop-blur-xl border border-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-left hover:scale-[0.98] transition-transform">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-3xl leading-none font-semibold tracking-tight text-orange-950">24</div>
              <div className="text-[12px] font-medium text-orange-800 mt-1">AI Replies</div>
            </button>

            {/* 1-Col Stat: Active Contacts */}
            <button onClick={() => setActiveTab("contacts")} className="col-span-1 rounded-[32px] bg-white/60 backdrop-blur-xl border border-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-left hover:scale-[0.98] transition-transform">
              <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
              <div className="text-3xl leading-none font-semibold tracking-tight text-gray-900">84</div>
              <div className="text-[12px] font-medium text-gray-500 mt-1">Active Contacts</div>
            </button>

            {/* Wide Chart Tile */}
            <div className="col-span-2 rounded-[32px] bg-white/60 backdrop-blur-xl border border-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex justify-between items-center mb-5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Activity</span>
                <div className="flex items-center gap-1 text-gray-400">
                  <span className="text-[10px] font-medium">This Week</span>
                  <TrendingUp className="w-3 h-3" />
                </div>
              </div>
              <div className="flex items-end justify-between h-14 px-1 gap-2">
                {[30, 45, 25, 60, 85, 40, 95].map((h, i) => (
                  <div key={i} className="w-full flex flex-col items-center gap-2">
                    <div 
                      className={`w-full rounded-full ${i === 6 ? 'bg-blue-500' : 'bg-blue-100'}`}
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[9px] font-medium text-gray-400">
                      {["S","M","T","W","T","F","S"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tall Recent List */}
            <div className="col-span-2 rounded-[32px] bg-white/60 backdrop-blur-xl border border-white p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col gap-1">
              <div className="px-4 pt-3 pb-2 flex justify-between items-center">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Recent</span>
                <button className="text-[11px] font-semibold text-blue-500">See All</button>
              </div>
              {RECENT.map((msg, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white/50 rounded-[24px] border border-white/40">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-gray-200 to-gray-50 flex items-center justify-center shadow-inner border border-white">
                      <span className="text-sm font-bold text-gray-700">{msg.name[0]}</span>
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${msg.color}`}>
                      <span className="text-[6px] font-bold text-white leading-none">
                        {msg.platform === 'wa' ? 'W' : msg.platform === 'li' ? 'in' : '@'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[13px] font-semibold text-gray-900 truncate">{msg.name}</span>
                      <span className="text-[11px] font-medium text-gray-400">{msg.time}</span>
                    </div>
                    <p className={`text-[12px] truncate ${msg.unread > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                      {msg.preview}
                    </p>
                  </div>
                  {msg.unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                      {msg.unread}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        ) : activeTab === "menu" ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2 px-2">Menu</h2>
            <div className="grid grid-cols-2 gap-3">
              {MENU_ITEMS.map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="flex flex-col items-center justify-center gap-3 p-6 rounded-[32px] bg-white/60 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                >
                  <div className={`w-12 h-12 rounded-full ${item.bg} flex items-center justify-center`}>
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <span className="text-[13px] font-semibold text-gray-700">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 mt-12 bg-white/60 backdrop-blur-xl border border-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              {activeTab === 'inbox' ? <Mail className="w-8 h-8 text-gray-400" /> : 
               activeTab === 'ai' ? <Sparkles className="w-8 h-8 text-gray-400" /> :
               <Settings className="w-8 h-8 text-gray-400" />}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2 capitalize">{activeTab}</h2>
            <p className="text-sm font-medium text-gray-500">This surface is under construction in the current bento mockup.</p>
            <button 
              onClick={() => setActiveTab("dashboard")}
              className="mt-6 px-6 py-2.5 bg-gray-900 text-white text-[13px] font-semibold rounded-full shadow-lg"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Floating Bottom Nav */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[342px] h-[72px] bg-white/70 backdrop-blur-2xl border border-white/60 rounded-[36px] shadow-[0_20px_40px_rgb(0,0,0,0.08)] flex items-center justify-between px-2 z-30">
        
        {NAV.map((item, i) => {
          const isActive = activeTab === item.id;
          
          return (
            <div key={item.id} className="relative flex-1 flex justify-center">
              {i === 2 && (
                <div className="absolute -top-[52px] left-1/2 -translate-x-1/2 pointer-events-none">
                  {/* Floating Action Button */}
                  <button className="w-[60px] h-[60px] rounded-full bg-gray-900 shadow-[0_12px_24px_rgb(0,0,0,0.2)] flex items-center justify-center text-white pointer-events-auto hover:scale-105 transition-transform active:scale-95">
                    <Plus className="w-7 h-7" />
                  </button>
                </div>
              )}
              
              <button 
                onClick={() => setActiveTab(item.id)}
                className={`w-14 h-14 rounded-full flex flex-col items-center justify-center gap-1 relative transition-colors ${
                  isActive ? "bg-black/5 text-gray-900" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <item.icon className={`w-[22px] h-[22px] ${isActive ? "stroke-[2.5px]" : "stroke-[2px]"}`} />
                {item.badge && (
                  <span className="absolute top-2.5 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white text-transparent flex items-center justify-center font-bold" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
