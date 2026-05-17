import { useLocation } from "wouter";
import {
  Mail,
  Brain,
  Mic,
  HardDrive,
  Calendar,
  Search,
  Check,
  ArrowRight,
  Inbox,
  Zap,
} from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const BG = "#0b1120";
const SURFACE = "#111827";
const SURFACE2 = "#1a2236";
const BORDER = "#1f2d45";
const PRIMARY = "#3b82f6";
const PRIMARY_HOVER = "#2563eb";
const FG = "#f1f5f9";
const FG_MUTED = "#94a3b8";
const FG_SUBTLE = "#64748b";

const features = [
  {
    icon: Inbox,
    title: "Unified Inbox",
    desc: "Gmail and Outlook in one place. No more switching between tabs.",
  },
  {
    icon: Brain,
    title: "Multi-Model AI",
    desc: "GPT-4o, Claude, and Gemini — pick the best model for every task.",
  },
  {
    icon: Mic,
    title: "Voice to Email",
    desc: "Dictate replies hands-free. AI polishes them before they send.",
  },
  {
    icon: HardDrive,
    title: "Cloud Storage",
    desc: "1 GB free, 25 GB on Pro. AI auto-tags and finds files for you.",
  },
  {
    icon: Calendar,
    title: "Calendar",
    desc: "Syncs with Gmail and Outlook. Month, week, and agenda views.",
  },
  {
    icon: Search,
    title: "Smart Search",
    desc: "Search emails, contacts, and files in plain English.",
  },
];

const freeFeatures = [
  "Gmail + Outlook inbox",
  "200 AI requests / day",
  "1 GB cloud storage",
  "Calendar sync",
  "Smart search",
  "Mobile app",
];

const proFeatures = [
  "Everything in Free",
  "Unlimited AI requests",
  "25 GB cloud storage",
  "Priority support",
  "All AI models",
  "Advanced analytics",
];

export function AuthHeroPanel() {
  return (
    <div
      className="flex flex-col gap-4"
      style={{ color: FG }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: PRIMARY,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 8px 24px rgba(59,130,246,0.35)`,
        }}
      >
        <span style={{ color: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: -1 }}>PB</span>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.25, margin: 0, color: FG }}>
        PinnboxIO
      </h1>
      <p style={{ fontSize: 15, color: FG_MUTED, margin: 0, lineHeight: 1.6 }}>
        Your inbox, powered by AI.
      </p>
    </div>
  );
}

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div style={{ backgroundColor: BG, color: FG, minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: `${BG}e8`,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${BORDER}`,
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>PB</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: FG }}>PinnboxIO</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => setLocation(`${basePath}/sign-in`)}
            style={{ background: "none", border: "none", color: FG_MUTED, fontSize: 14, fontWeight: 500, cursor: "pointer", padding: "8px 12px", borderRadius: 8 }}
            onMouseEnter={e => (e.currentTarget.style.color = FG)}
            onMouseLeave={e => (e.currentTarget.style.color = FG_MUTED)}
          >
            Sign in
          </button>
          <button
            onClick={() => setLocation(`${basePath}/sign-up`)}
            style={{ backgroundColor: PRIMARY, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = PRIMARY_HOVER)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = PRIMARY)}
          >
            Get started free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "96px 24px 80px", maxWidth: 760, margin: "0 auto" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            backgroundColor: `${PRIMARY}18`,
            border: `1px solid ${PRIMARY}40`,
            borderRadius: 100,
            padding: "5px 14px",
            fontSize: 12,
            fontWeight: 600,
            color: PRIMARY,
            marginBottom: 28,
            letterSpacing: 0.4,
          }}
        >
          <Zap size={12} />
          GPT-4o · Claude · Gemini
        </div>

        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 60px)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -1.5,
            margin: "0 0 20px",
            color: FG,
          }}
        >
          Your inbox,{" "}
          <span style={{ color: PRIMARY }}>powered by AI</span>
        </h1>

        <p style={{ fontSize: 18, color: FG_MUTED, lineHeight: 1.7, margin: "0 0 40px", maxWidth: 540, marginLeft: "auto", marginRight: "auto" }}>
          Unify Gmail and Outlook, chat with multiple AI models, manage files and calendar — all in one app.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setLocation(`${basePath}/sign-up`)}
            style={{
              backgroundColor: PRIMARY,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "14px 28px",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = PRIMARY_HOVER)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = PRIMARY)}
          >
            Get started free <ArrowRight size={16} />
          </button>
          <button
            onClick={() => setLocation(`${basePath}/sign-in`)}
            style={{
              backgroundColor: "transparent",
              color: FG_MUTED,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: "14px 28px",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = FG_SUBTLE; e.currentTarget.style.color = FG; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = FG_MUTED; }}
          >
            Sign in
          </button>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "0 24px 96px", maxWidth: 1080, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 700, marginBottom: 12, color: FG }}>
          Everything in one place
        </h2>
        <p style={{ textAlign: "center", color: FG_MUTED, marginBottom: 48, fontSize: 16 }}>
          Stop juggling apps. PinnboxIO replaces six tools with one.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              style={{
                backgroundColor: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 16,
                padding: "24px 24px 20px",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: `${PRIMARY}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <Icon size={20} color={PRIMARY} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", color: FG }}>{title}</h3>
              <p style={{ fontSize: 14, color: FG_MUTED, margin: 0, lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: "0 24px 96px", maxWidth: 820, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 700, marginBottom: 12, color: FG }}>
          Simple pricing
        </h2>
        <p style={{ textAlign: "center", color: FG_MUTED, marginBottom: 48, fontSize: 16 }}>
          Free forever. Upgrade when you need more.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>

          {/* Free */}
          <div
            style={{
              backgroundColor: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: 20,
              padding: 32,
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: FG_MUTED, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>Free</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: FG }}>$0</span>
              <span style={{ fontSize: 15, color: FG_SUBTLE }}>/month</span>
            </div>
            <p style={{ fontSize: 14, color: FG_MUTED, margin: "0 0 28px" }}>Everything you need to get started.</p>
            <button
              onClick={() => setLocation(`${basePath}/sign-up`)}
              style={{
                width: "100%",
                backgroundColor: SURFACE2,
                color: FG,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "12px 0",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: 28,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = FG_SUBTLE)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
            >
              Get started free
            </button>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {freeFeatures.map(f => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: FG_MUTED }}>
                  <Check size={15} color={FG_SUBTLE} />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div
            style={{
              backgroundColor: SURFACE,
              border: `2px solid ${PRIMARY}`,
              borderRadius: 20,
              padding: 32,
              position: "relative",
              boxShadow: `0 0 40px rgba(59,130,246,0.12)`,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -13,
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: PRIMARY,
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                padding: "4px 14px",
                borderRadius: 100,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Most popular
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: PRIMARY, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>Pro</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: FG }}>$7.99</span>
              <span style={{ fontSize: 15, color: FG_SUBTLE }}>/month</span>
            </div>
            <p style={{ fontSize: 14, color: FG_MUTED, margin: "0 0 28px" }}>
              Or{" "}
              <span style={{ color: FG, fontWeight: 600 }}>$59.99/year</span>
              {" "}— save 37%.
            </p>
            <button
              onClick={() => setLocation(`${basePath}/sign-up`)}
              style={{
                width: "100%",
                backgroundColor: PRIMARY,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "12px 0",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                marginBottom: 28,
                boxShadow: "0 4px 16px rgba(59,130,246,0.35)",
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = PRIMARY_HOVER)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = PRIMARY)}
            >
              Start Pro free trial
            </button>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {proFeatures.map(f => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: FG_MUTED }}>
                  <Check size={15} color={PRIMARY} />
                  {f}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: `1px solid ${BORDER}`,
          padding: "32px 24px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          maxWidth: 1080,
          margin: "0 auto",
        }}
      >
        <span style={{ fontSize: 13, color: FG_SUBTLE }}>© {new Date().getFullYear()} PinnboxIO. All rights reserved.</span>
        <div style={{ display: "flex", gap: 20 }}>
          {(["Terms", "Privacy", "Refunds", "Cookies"] as const).map(label => (
            <a
              key={label}
              href={`${basePath}/${label.toLowerCase()}`}
              style={{ fontSize: 13, color: FG_SUBTLE, textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.color = FG_MUTED)}
              onMouseLeave={e => (e.currentTarget.style.color = FG_SUBTLE)}
            >
              {label}
            </a>
          ))}
        </div>
      </footer>

    </div>
  );
}
