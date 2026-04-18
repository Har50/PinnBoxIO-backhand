import { LayoutDashboard, Mail, Users, Search, MessageCircle, Settings, Sparkles, Linkedin, PenSquare, ChevronRight, TrendingUp, Clock } from "lucide-react";
import { useState } from "react";

const NAV = [
  { icon: LayoutDashboard, label: "Home" },
  { icon: Mail, label: "Inbox", badge: 3 },
  { icon: Sparkles, label: "AI" },
  { icon: Users, label: "Contacts" },
  { icon: Settings, label: "More" },
];

const STATS = [
  { label: "Unread", value: "12", color: "bg-blue-500", icon: Mail },
  { label: "Contacts", value: "84", color: "bg-violet-500", icon: Users },
  { label: "Messages", value: "247", color: "bg-emerald-500", icon: MessageCircle },
];

const RECENT = [
  { name: "Alice Johnson", preview: "Thanks for the update!", time: "2m", unread: 2, platform: "wa" },
  { name: "Bob Smith", preview: "Can we reschedule?", time: "14m", unread: 0, platform: "li" },
  { name: "Carol Lee", preview: "Invoice attached ✓", time: "1h", unread: 1, platform: "wa" },
  { name: "Dan Park", preview: "See you tomorrow!", time: "3h", unread: 0, platform: "em" },
];

export function BottomNav() {
  const [active, setActive] = useState(0);

  return (
    <div className="w-[390px] h-[844px] bg-gray-50 flex flex-col overflow-hidden rounded-[40px] shadow-2xl border border-border">
      {/* Status bar */}
      <div className="flex-shrink-0 bg-white px-6 pt-3 pb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-800">9:41</span>
        <div className="flex items-center gap-1 text-gray-600">
          <div className="flex gap-px items-end h-3">
            {[2,3,4,4].map((h,i) => <div key={i} className="w-1 bg-gray-700 rounded-sm" style={{height:`${h*3}px`}} />)}
          </div>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M1.5 8.5a13 13 0 0121 0M5.2 12.2a8 8 0 0113.6 0M8.9 15.9a4 4 0 016.2 0M12 20h.01"/></svg>
          <div className="flex items-center gap-0.5 border border-gray-400 rounded-sm px-0.5 py-px">
            <div className="w-4 h-2 bg-gray-800 rounded-sm" />
            <div className="w-0.5 h-1.5 bg-gray-400 rounded-r-sm" />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex-shrink-0 bg-white px-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-xs">PI</div>
              <span className="font-semibold text-gray-900">PinnboxIO</span>
            </div>
          </div>
          <button className="flex items-center gap-1.5 bg-blue-500 text-white rounded-full px-3 py-1.5 text-xs font-medium shadow-sm shadow-blue-200">
            <PenSquare className="w-3 h-3" />
            Compose
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {active === 0 && (
          <div className="p-4 space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {STATS.map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                  <div className={`w-7 h-7 ${color} rounded-lg flex items-center justify-center mb-2`}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="text-lg font-bold text-gray-900 leading-none">{value}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Recent messages */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent</span>
                <button className="text-xs text-blue-500 font-medium flex items-center gap-0.5">See all <ChevronRight className="w-3 h-3" /></button>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {RECENT.map(({ name, preview, time, unread, platform }) => (
                  <div key={name} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-violet-400 flex items-center justify-center text-white text-xs font-bold">
                        {name[0]}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white ${platform === "wa" ? "bg-green-500" : platform === "li" ? "bg-[#0A66C2]" : "bg-gray-400"}`}>
                        {platform === "wa" ? "W" : platform === "li" ? "in" : "@"}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${unread > 0 ? "text-gray-900" : "text-gray-600"}`}>{name}</span>
                        <span className="text-[10px] text-gray-400">{time}</span>
                      </div>
                      <div className={`text-[11px] truncate mt-px ${unread > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>{preview}</div>
                    </div>
                    {unread > 0 && (
                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[9px] text-white font-bold flex-shrink-0">{unread}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Access</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: MessageCircle, label: "WhatsApp", color: "bg-green-50 text-green-600 border-green-100" },
                  { icon: Linkedin, label: "LinkedIn", color: "bg-blue-50 text-blue-600 border-blue-100" },
                  { icon: Search, label: "Search", color: "bg-violet-50 text-violet-600 border-violet-100" },
                  { icon: TrendingUp, label: "Analytics", color: "bg-amber-50 text-amber-600 border-amber-100" },
                ].map(({ icon: Icon, label, color }) => (
                  <button key={label} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium ${color}`}>
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {active === 1 && (
          <div className="p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> All Messages
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {[...RECENT, { name: "Eva Martinez", preview: "Great work on the project", time: "1d", unread: 0, platform: "em" }].map(({ name, preview, time, unread, platform }) => (
                <div key={name} className="flex items-center gap-3 px-3 py-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-violet-400 flex items-center justify-center text-white text-sm font-bold">
                      {name[0]}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white ${platform === "wa" ? "bg-green-500" : platform === "li" ? "bg-[#0A66C2]" : "bg-gray-400"}`}>
                      {platform === "wa" ? "W" : platform === "li" ? "in" : "@"}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${unread > 0 ? "text-gray-900" : "text-gray-600"}`}>{name}</span>
                      <span className="text-[11px] text-gray-400">{time}</span>
                    </div>
                    <div className={`text-xs truncate mt-0.5 ${unread > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>{preview}</div>
                  </div>
                  {unread > 0 && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">{unread}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(active === 2 || active === 3 || active === 4) && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 pb-16">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              {active === 2 && <Sparkles className="w-6 h-6 text-violet-400" />}
              {active === 3 && <Users className="w-6 h-6 text-blue-400" />}
              {active === 4 && <Settings className="w-6 h-6 text-gray-400" />}
            </div>
            <p className="text-sm font-medium text-gray-500">{NAV[active].label}</p>
            <p className="text-xs text-gray-400">Full content area available</p>
          </div>
        )}
      </div>

      {/* Bottom navigation bar */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-2 pt-1 pb-5 shadow-[0_-1px_0_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around">
          {NAV.map(({ icon: Icon, label, badge }, i) => (
            <button
              key={label}
              onClick={() => setActive(i)}
              className="flex flex-col items-center gap-1 px-3 py-1.5 relative"
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active === i ? "text-blue-500" : "text-gray-400"}`} />
                {badge && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                    {badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${active === i ? "text-blue-500" : "text-gray-400"}`}>{label}</span>
              {active === i && <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
