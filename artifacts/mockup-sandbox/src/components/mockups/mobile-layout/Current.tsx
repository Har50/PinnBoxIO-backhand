import { LayoutDashboard, Mail, Users, Search, MessageCircle, Settings, Sparkles, Linkedin, PenSquare, CreditCard, ChevronDown } from "lucide-react";

export function Current() {
  return (
    <div className="w-[390px] h-[844px] bg-background overflow-hidden flex flex-col border border-border rounded-[40px] shadow-2xl relative">
      <div className="flex h-full overflow-hidden">
        {/* Sidebar — 256px on a 390px screen */}
        <div className="w-64 flex-shrink-0 bg-slate-900 text-white flex flex-col text-sm h-full">
          <div className="p-4 flex items-center gap-2 border-b border-white/10">
            <div className="w-7 h-7 rounded bg-blue-500 flex items-center justify-center font-bold text-xs">PI</div>
            <span className="font-semibold">PinnboxIO</span>
          </div>

          <div className="px-3 py-2 flex flex-col gap-1.5">
            <button className="w-full flex items-center gap-2 bg-blue-500 text-white rounded px-2.5 py-1.5 text-xs font-medium">
              <PenSquare className="w-3 h-3" /> Compose
            </button>
            <button className="w-full flex items-center gap-2 border border-emerald-400/40 text-emerald-400 rounded px-2.5 py-1.5 text-xs font-medium">
              <CreditCard className="w-3 h-3" /> Pay
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-1 flex flex-col gap-0.5">
            {[
              { icon: LayoutDashboard, label: "Dashboard", active: true },
              { icon: Mail, label: "Inbox", badge: 3 },
              { icon: Sparkles, label: "AI Assistant" },
              { icon: Users, label: "Contacts" },
            ].map(({ icon: Icon, label, active, badge }) => (
              <div key={label} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${active ? "bg-white/20" : "text-white/70"}`}>
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {badge && <span className="bg-red-500 text-white text-[9px] rounded-full px-1 min-w-[14px] text-center">{badge}</span>}
              </div>
            ))}
            <div className="mt-2">
              <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                <span>Important People</span>
                <ChevronDown className="w-3 h-3" />
              </div>
              {["Alice Johnson", "Bob Smith", "Carol Lee"].map(name => (
                <div key={name} className="flex items-center gap-2 px-2 py-1 text-[10px] text-white/60">
                  <div className="w-5 h-5 rounded-full bg-blue-400/40 flex items-center justify-center text-[9px] font-bold text-blue-200 flex-shrink-0">
                    {name[0]}
                  </div>
                  <span className="truncate">{name}</span>
                </div>
              ))}
            </div>
            <div className="my-1 border-t border-white/10" />
            {[
              { icon: Search, label: "Search" },
              { icon: MessageCircle, label: "WhatsApp" },
              { icon: Linkedin, label: "LinkedIn" },
              { icon: Settings, label: "Accounts" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-white/70">
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{label}</span>
              </div>
            ))}
          </nav>
        </div>

        {/* Main content — only 130px wide left */}
        <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
          <div className="p-2 border-b bg-white text-[10px] font-semibold text-gray-500 truncate">Dashboard</div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-2">
              <div className="text-[9px] text-gray-400 leading-relaxed">Very little space remains for content</div>
              <div className="mt-2 w-full h-8 bg-gray-200 rounded animate-pulse" />
              <div className="mt-1 w-full h-8 bg-gray-200 rounded animate-pulse opacity-60" />
              <div className="mt-1 w-full h-8 bg-gray-200 rounded animate-pulse opacity-40" />
            </div>
          </div>
        </div>
      </div>

      {/* Problem overlay callout */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white text-[10px] font-medium rounded-full px-3 py-1 whitespace-nowrap shadow">
        ⚠ Sidebar takes 66% of screen width
      </div>
    </div>
  );
}
