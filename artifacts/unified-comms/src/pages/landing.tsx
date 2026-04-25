import { Mail, Users, Search } from "lucide-react";
import { useLocation } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export const heroFeatures = [
  { Icon: Mail, label: "Unified email inbox across all accounts" },
  { Icon: Users, label: "Smart contact management" },
  { Icon: Search, label: "Global message search" },
];

export function AuthHeroPanel() {
  return (
    <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-6 w-full md:max-w-sm">
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: "#3b82f6",
          boxShadow: "0 8px 32px rgba(59,130,246,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: "#ffffff",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: -1,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          PB
        </span>
      </div>

      <div>
        <h1
          style={{
            color: "#f1f5f9",
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: -0.5,
            fontFamily: "Inter, system-ui, sans-serif",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          PinnboxIO
        </h1>
        <p
          style={{
            color: "#94a3b8",
            fontSize: 15,
            fontFamily: "Inter, system-ui, sans-serif",
            lineHeight: 1.6,
            marginTop: 8,
            marginBottom: 0,
          }}
        >
          Your unified communications workspace — email, contacts, and messages in one place.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {heroFeatures.map(({ Icon, label }) => (
          <div key={label} className="flex items-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "#1e3a5f",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={16} color="#3b82f6" />
            </div>
            <span
              style={{
                color: "#e2e8f0",
                fontSize: 14,
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 500,
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-6 py-12"
      style={{ backgroundColor: "#0f172a" }}
    >
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <AuthHeroPanel />

        <div style={{ height: 1, backgroundColor: "#1e293b", width: "100%" }} />

        <button
          onClick={() => setLocation("/sign-in")}
          className="w-full"
          style={{
            backgroundColor: "#3b82f6",
            color: "#ffffff",
            borderRadius: 14,
            paddingTop: 16,
            paddingBottom: 16,
            fontSize: 16,
            fontWeight: 600,
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: 0.2,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#2563eb";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#3b82f6";
          }}
        >
          Sign in
        </button>

        <button
          onClick={() => setLocation("/sign-up")}
          className="w-full"
          style={{
            backgroundColor: "transparent",
            color: "#94a3b8",
            borderRadius: 14,
            paddingTop: 14,
            paddingBottom: 14,
            fontSize: 15,
            fontWeight: 500,
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: 0.1,
            border: "1px solid #1e293b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#334155";
            (e.currentTarget as HTMLButtonElement).style.color = "#e2e8f0";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#1e293b";
            (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
          }}
        >
          Create account
        </button>

        <div className="flex flex-wrap justify-center gap-4 text-xs" style={{ color: "#64748b" }}>
          <a href={`${basePath}/terms`} className="hover:text-slate-300 transition-colors">Terms</a>
          <a href={`${basePath}/privacy`} className="hover:text-slate-300 transition-colors">Privacy</a>
          <a href={`${basePath}/refunds`} className="hover:text-slate-300 transition-colors">Refunds</a>
          <a href={`${basePath}/cookies`} className="hover:text-slate-300 transition-colors">Cookies</a>
        </div>
      </div>
    </div>
  );
}
