import React, { useState } from "react";
import {
  LayoutDashboard,
  Mail,
  Users,
  Search,
  MessageCircle,
  Settings,
  Sparkles,
  Linkedin,
  Menu,
  X
} from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Today" },
  { icon: Mail, label: "Inbox", badge: 3 },
  { icon: Sparkles, label: "Assistant" },
  { icon: Users, label: "Contacts" },
  { icon: MessageCircle, label: "WhatsApp" },
  { icon: Linkedin, label: "LinkedIn" },
  { icon: Search, label: "Search" },
  { icon: Settings, label: "Settings" },
];

const HIGHLIGHTS = [
  {
    name: "Alice J.",
    preview: "Thanks for the update! Let me know when you have more info.",
    time: "2m ago",
    unread: 2,
    platform: "WhatsApp",
    color: "text-[#8a9a86]",
  },
  {
    name: "Bob S.",
    preview: "Can we reschedule our sync for next Tuesday?",
    time: "14m ago",
    unread: 0,
    platform: "LinkedIn",
    color: "text-[#2d2824]",
  },
  {
    name: "Carol L.",
    preview: "The latest invoice is attached. Please review.",
    time: "1h ago",
    unread: 1,
    platform: "WhatsApp",
    color: "text-[#8a9a86]",
  },
  {
    name: "David K.",
    preview: "Q2 numbers look great. Looking forward to the presentation.",
    time: "3h ago",
    unread: 0,
    platform: "Email",
    color: "text-[#2d2824]",
  },
];

export function EditorialCalm() {
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="w-[390px] h-[844px] overflow-hidden flex flex-col rounded-[40px] shadow-2xl border border-[#e8e2d9] relative"
      style={{ backgroundColor: "#faf7f2", color: "#2d2824" }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
      `}} />

      {/* Top Header / Status Bar Area */}
      <div className="h-14 w-full shrink-0 flex items-end justify-between px-6 pb-2 border-b border-[#e8e2d9] bg-[#faf7f2]/90 backdrop-blur-md z-10">
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 -ml-1 text-[#8a857f] hover:text-[#2d2824] transition-colors">
          <Menu strokeWidth={1.5} size={20} />
        </button>
        <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#8a857f]">
          Pinnbox
        </span>
        <button className="p-1 -mr-1 text-[#8a857f] hover:text-[#2d2824] transition-colors">
          <Search strokeWidth={1.5} size={18} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pb-6 pt-6 flex flex-col">
        {active === 0 ? (
          <div className="flex flex-col h-full space-y-10 animate-in fade-in duration-700">
            {/* Header */}
            <div className="space-y-3">
              <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#8a857f] font-medium">
                Saturday, Apr 18
              </h2>
              <h1
                className="text-[44px] tracking-tight leading-[1.1]"
                style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
              >
                Today
              </h1>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between border-y border-[#e8e2d9] py-6">
              <div className="flex flex-col items-center">
                <span
                  className="text-3xl font-light"
                  style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                >
                  3
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#8a857f] mt-2">
                  Unread
                </span>
              </div>
              <div className="w-[1px] h-10 bg-[#e8e2d9]" />
              <div className="flex flex-col items-center">
                <span
                  className="text-3xl font-light"
                  style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                >
                  84
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#8a857f] mt-2">
                  Contacts
                </span>
              </div>
              <div className="w-[1px] h-10 bg-[#e8e2d9]" />
              <div className="flex flex-col items-center">
                <span
                  className="text-3xl font-light"
                  style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                >
                  24
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#8a857f] mt-2">
                  AI Replies
                </span>
              </div>
            </div>

            {/* Highlights List */}
            <div className="flex-1 space-y-6">
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#8a857f] font-medium">
                Inbox Highlights
              </h3>
              <div className="space-y-8">
                {HIGHLIGHTS.map((item, idx) => (
                  <div key={idx} className="group cursor-pointer">
                    <div className="flex justify-between items-baseline mb-2">
                      <span
                        className="text-xl text-[#2d2824]"
                        style={{
                          fontFamily: '"Playfair Display", Georgia, serif',
                        }}
                      >
                        {item.name}
                      </span>
                      <span className="text-[10px] text-[#8a857f] uppercase tracking-wider">
                        {item.time}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-[14px] text-[#5d5854] font-light leading-relaxed line-clamp-2">
                        {item.preview}
                      </p>
                      {item.unread > 0 && (
                        <div className="w-2 h-2 rounded-full bg-[#c06b52] shrink-0 mt-2" />
                      )}
                    </div>
                    <div className="text-[10px] text-[#8a857f] mt-3 uppercase tracking-wider font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-[1px] bg-[#8a857f]"></span>
                      {item.platform}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Activity Chart (Abstract/Minimalist) */}
            <div className="pt-8 pb-4 border-t border-[#e8e2d9]">
              <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#8a857f] font-medium mb-6">
                Weekly Flow
              </h3>
              <div className="flex items-end justify-between h-20 px-2">
                {[30, 45, 25, 60, 80, 40, 90].map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-3">
                    <div
                      className="w-[2px] bg-[#c06b52] opacity-70"
                      style={{ height: `${h}px` }}
                    />
                    <span className="text-[9px] text-[#8a857f] uppercase font-medium">
                      {['M','T','W','T','F','S','S'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in h-full">
            {(() => {
              const Icon = NAV[active].icon;
              return <Icon className="w-8 h-8 text-[#c06b52] mb-6 opacity-80" strokeWidth={1} />;
            })()}
            <h1
              className="text-3xl text-[#2d2824] mb-4 text-center"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              {NAV[active].label}
            </h1>
            <p className="text-sm text-[#8a857f] font-light text-center max-w-[200px] leading-relaxed">
              A quiet space for your {NAV[active].label.toLowerCase()}.
            </p>
          </div>
        )}
      </div>

      {/* Slide-over Menu */}
      {menuOpen && (
        <div className="absolute inset-0 z-20 flex bg-[#2d2824]/20 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-[280px] h-full bg-[#faf7f2] shadow-2xl border-r border-[#e8e2d9] animate-in slide-in-from-left duration-300 flex flex-col">
            <div className="h-14 flex items-end justify-between px-6 pb-2 border-b border-[#e8e2d9]">
               <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#8a857f]">
                Menu
              </span>
              <button onClick={() => setMenuOpen(false)} className="p-1 -mr-1 text-[#8a857f] hover:text-[#2d2824] transition-colors">
                 <X strokeWidth={1.5} size={20} />
              </button>
            </div>
            <div className="flex-1 py-8 px-6 space-y-8 overflow-y-auto hide-scrollbar">
               {NAV.map((item, i) => (
                 <div key={item.label}>
                   <button
                     onClick={() => { setActive(i); setMenuOpen(false); }}
                     className="w-full flex items-center justify-between text-left group"
                   >
                     <span className={`text-xl ${active === i ? "text-[#c06b52]" : "text-[#2d2824] group-hover:text-[#c06b52]"} transition-colors`} style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
                       {item.label}
                     </span>
                     {item.badge && (
                       <span className="text-[10px] bg-[#c06b52] text-[#faf7f2] px-2 py-0.5 rounded-full font-medium">
                         {item.badge}
                       </span>
                     )}
                   </button>
                 </div>
               ))}
            </div>
          </div>
          <div className="flex-1 cursor-pointer" onClick={() => setMenuOpen(false)} />
        </div>
      )}

      {/* Bottom Nav (Magazine index style - text only) */}
      <div className="shrink-0 bg-[#faf7f2] border-t border-[#e8e2d9] pb-8 pt-4 px-6 relative z-10">
        <div className="flex justify-between items-center overflow-x-auto hide-scrollbar gap-8">
          {NAV.slice(0, 4).map((item, i) => {
            const isActive = active === i;
            return (
              <button
                key={item.label}
                onClick={() => setActive(i)}
                className={`flex flex-col items-center gap-1.5 transition-colors min-w-max ${
                  isActive ? "text-[#c06b52]" : "text-[#8a857f]"
                }`}
              >
                <div className="relative">
                  <span className={`text-[10px] uppercase tracking-[0.15em] font-medium ${isActive ? "font-bold" : ""}`}>
                    {item.label}
                  </span>
                  {item.badge && (
                     <span className="absolute -top-1 -right-3 w-1.5 h-1.5 rounded-full bg-[#c06b52]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
