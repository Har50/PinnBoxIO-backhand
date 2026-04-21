import {
  LayoutDashboard, Mail, Users, Search, MessageCircle,
  Settings, Sparkles, Linkedin, PenSquare, TrendingUp,
  ArrowUpRight, Clock, ChevronRight
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Mail, label: "Inbox", badge: 3 },
  { icon: Sparkles, label: "AI" },
  { icon: Users, label: "Contacts" },
  { icon: MessageCircle, label: "WhatsApp" },
  { icon: Linkedin, label: "LinkedIn" },
  { icon: Search, label: "Search" },
  { icon: Settings, label: "Accounts" },
];

const RECENT = [
  { name: "Alice J.", preview: "Thanks for the update!", time: "2m", unread: 2, platform: "wa" },
  { name: "Bob S.", preview: "Can we reschedule?", time: "14m", unread: 0, platform: "li" },
  { name: "Carol L.", preview: "Invoice attached ✓", time: "1h", unread: 1, platform: "wa" },
];

export function Current() {
  const [active, setActive] = useState(0);

  return (
    <div className="w-[390px] h-[844px] bg-background overflow-hidden flex rounded-[40px] shadow-2xl border border-border">

      {/* Slim icon sidebar — 52px */}
      <div className="w-[52px] flex-shrink-0 bg-slate-900 flex flex-col items-center py-4 gap-1">
        {/* Logo */}
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-[10px] mb-3">
          PB
        </div>

        {/* Compose FAB */}
        <button className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-900/40 mb-2">
          <PenSquare className="w-3.5 h-3.5" />
        </button>

        {/* Nav icons */}
        {NAV.map(({ icon: Icon, label, badge }, i) => (
          <button
            key={label}
            title={label}
            onClick={() => setActive(i)}
            className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              active === i
                ? "bg-white/20 text-white"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            <Icon className="w-4 h-4" />
            {badge && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 border border-slate-900" />
            )}
          </button>
        ))}
      </div>

      {/* Main content — full remaining width: 338px */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

        {/* Page header */}
        <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900">{NAV[active].label}</h1>
            <p className="text-xs text-gray-400">Saturday, Apr 18</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-400 flex items-center justify-center text-white text-xs font-bold">
            AJ
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">

          {active === 0 && (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Unread Messages", value: "12", delta: "+3", icon: Mail, color: "from-blue-500 to-blue-600" },
                  { label: "Active Contacts", value: "84", delta: "+7", icon: Users, color: "from-violet-500 to-violet-600" },
                  { label: "WhatsApp", value: "6", delta: "new", icon: MessageCircle, color: "from-emerald-500 to-emerald-600" },
                  { label: "AI Replies", value: "24", delta: "today", icon: Sparkles, color: "from-amber-400 to-orange-500" },
                ].map(({ label, value, delta, icon: Icon, color }) => (
                  <div key={label} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
                    <div className={`w-8 h-8 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-2`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-xl font-bold text-gray-900 leading-none">{value}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 truncate">{label}</div>
                    <div className="flex items-center gap-1 mt-1.5">
                      <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                      <span className="text-[10px] text-emerald-600 font-medium">{delta}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Activity bar chart */}
              <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-700">Message Activity</span>
                  <span className="text-[10px] text-blue-500 font-medium flex items-center gap-0.5">This week <TrendingUp className="w-3 h-3" /></span>
                </div>
                <div className="flex items-end gap-1.5 h-14">
                  {[30, 55, 45, 70, 85, 60, 90].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-sm ${i === 6 ? "bg-blue-500" : "bg-blue-200"}`}
                        style={{ height: `${h}%` }}
                      />
                      <span className="text-[8px] text-gray-300">{["M","T","W","T","F","S","S"][i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent conversations */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Recent
                  </span>
                  <button className="text-[10px] text-blue-500 font-medium flex items-center gap-0.5">
                    All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                  {RECENT.map(({ name, preview, time, unread, platform }) => (
                    <div key={name} className="flex items-center gap-2.5 px-3 py-2.5">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-violet-400 flex items-center justify-center text-white text-xs font-bold">
                          {name[0]}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-white text-[7px] font-bold flex items-center justify-center ${platform === "wa" ? "bg-green-500" : platform === "li" ? "bg-[#0A66C2]" : "bg-gray-400"}`}>
                          {platform === "wa" ? "W" : platform === "li" ? "in" : "@"}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-800">{name}</span>
                          <span className="text-[10px] text-gray-400">{time}</span>
                        </div>
                        <p className={`text-[11px] truncate mt-px ${unread ? "text-gray-600 font-medium" : "text-gray-400"}`}>{preview}</p>
                      </div>
                      {unread > 0 && (
                        <div className="w-4 h-4 rounded-full bg-blue-500 text-[9px] text-white font-bold flex items-center justify-center flex-shrink-0">{unread}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {active !== 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                {(() => { const Icon = NAV[active].icon; return <Icon className="w-6 h-6 text-gray-400" />; })()}
              </div>
              <p className="text-sm font-medium text-gray-500">{NAV[active].label}</p>
              <p className="text-xs text-gray-400">Full content here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
