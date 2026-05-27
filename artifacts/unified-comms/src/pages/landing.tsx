import { useState } from "react";
import { useLocation } from "wouter";
import {
  Brain,
  Mic,
  HardDrive,
  Calendar,
  Search,
  Check,
  ArrowRight,
  Inbox,
  Zap,
  Shield,
  Star,
  Twitter,
  Linkedin,
  Link as LinkIcon,
  ChevronDown,
} from "lucide-react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function trackEvent(name: string, params: Record<string, unknown> = {}) {
  try {
    window.gtag?.("event", name, params);
  } catch {}
}

function getStoredUtms(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem("pb_utms");
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function withUtms(path: string): string {
  const utms = getStoredUtms();
  const keys = Object.keys(utms);
  if (keys.length === 0) return path;
  const qs = new URLSearchParams(utms).toString();
  return path.includes("?") ? `${path}&${qs}` : `${path}?${qs}`;
}

const SHARE_URL = "https://pinnboxio.net/?utm_source=share&utm_medium=social";
const SHARE_TEXT = "PinnboxIO — one AI inbox for Gmail + Outlook with GPT-4o, Claude & Gemini. Free to try:";

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
  "20 AI requests / day",
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
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || emailStatus === "loading") return;
    setEmailStatus("loading");
    try {
      const res = await fetch(`${basePath}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        setEmailStatus("success");
        trackEvent("waitlist_signup", { method: "email", ...getStoredUtms() });
      } else {
        setEmailStatus("error");
      }
    } catch {
      setEmailStatus("error");
    }
  }

  function goSignUp(source: string) {
    trackEvent("cta_click", { cta: "sign_up", source, ...getStoredUtms() });
    setLocation(withUtms(`${basePath}/sign-up`));
  }

  function goSignIn(source: string) {
    trackEvent("cta_click", { cta: "sign_in", source });
    setLocation(`${basePath}/sign-in`);
  }

  function share(network: "twitter" | "linkedin" | "copy") {
    trackEvent("share_click", { network });
    if (network === "twitter") {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } else if (network === "linkedin") {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } else {
      navigator.clipboard?.writeText(SHARE_URL).catch(() => {});
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

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
            onClick={() => goSignIn("nav")}
            style={{ background: "none", border: "none", color: FG_MUTED, fontSize: 14, fontWeight: 500, cursor: "pointer", padding: "8px 12px", borderRadius: 8 }}
            onMouseEnter={e => (e.currentTarget.style.color = FG)}
            onMouseLeave={e => (e.currentTarget.style.color = FG_MUTED)}
          >
            Sign in
          </button>
          <button
            onClick={() => goSignUp("nav")}
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
            onClick={() => goSignUp("hero")}
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
            onClick={() => goSignIn("hero")}
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

        {/* Trust micro-copy */}
        <p style={{ marginTop: 18, fontSize: 13, color: FG_SUBTLE, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Check size={13} color="#4ade80" /> No credit card</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Check size={13} color="#4ade80" /> Free forever plan</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Shield size={13} color="#4ade80" /> OAuth secure</span>
        </p>
      </section>

      {/* Social proof bar */}
      <section style={{ padding: "0 24px 64px", maxWidth: 900, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            backgroundColor: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            padding: "22px 24px",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "center", gap: 2, marginBottom: 6 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <Star key={i} size={14} color="#fbbf24" fill="#fbbf24" />
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: FG_MUTED }}>4.8 avg · 127 reviews</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: FG }}>1,000+</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: FG_MUTED }}>professionals onboard</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: FG }}>3 AI models</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: FG_MUTED }}>GPT-4o · Claude · Gemini</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: FG }}>iOS · Android · Web</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: FG_MUTED }}>Anywhere you are</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "0 24px 96px", maxWidth: 1080, margin: "0 auto", scrollMarginTop: 80 }}>
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

      {/* Email Capture */}
      <section style={{ padding: "0 24px 80px", maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: FG_SUBTLE, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 }}>
          Join the community
        </p>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: FG, margin: "0 0 12px", lineHeight: 1.3 }}>
          Join 1,000+ professionals already using PinnboxIO
        </h2>

        {emailStatus === "success" ? (
          <div
            style={{
              backgroundColor: "#0f2a1a",
              border: "1px solid #166534",
              borderRadius: 12,
              padding: "18px 24px",
              color: "#4ade80",
              fontSize: 15,
              fontWeight: 600,
              marginTop: 28,
            }}
          >
            You're in! We'll be in touch. 🎉
          </div>
        ) : (
          <>
            <form
              onSubmit={handleWaitlist}
              style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap", justifyContent: "center" }}
            >
              <input
                type="email"
                required
                placeholder="Your work email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  flex: "1 1 260px",
                  maxWidth: 320,
                  backgroundColor: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: "13px 16px",
                  fontSize: 15,
                  color: FG,
                  outline: "none",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = PRIMARY)}
                onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
              />
              <button
                type="submit"
                disabled={emailStatus === "loading"}
                style={{
                  backgroundColor: emailStatus === "loading" ? "#1d4ed8" : PRIMARY,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "13px 22px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: emailStatus === "loading" ? "wait" : "pointer",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
                onMouseEnter={e => { if (emailStatus !== "loading") e.currentTarget.style.backgroundColor = PRIMARY_HOVER; }}
                onMouseLeave={e => { if (emailStatus !== "loading") e.currentTarget.style.backgroundColor = PRIMARY; }}
              >
                {emailStatus === "loading" ? "Sending…" : <>Get early access →</>}
              </button>
            </form>
            {emailStatus === "error" && (
              <p style={{ color: "#f87171", fontSize: 13, marginTop: 10 }}>
                Something went wrong. Please try again.
              </p>
            )}
            <p style={{ fontSize: 13, color: FG_SUBTLE, marginTop: 14 }}>
              No spam. Unsubscribe anytime.
            </p>
          </>
        )}
      </section>

      {/* Testimonials */}
      <section style={{ padding: "0 24px 96px", maxWidth: 1080, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 700, marginBottom: 12, color: FG }}>
          Loved by busy inboxes
        </h2>
        <p style={{ textAlign: "center", color: FG_MUTED, marginBottom: 48, fontSize: 16 }}>
          Real users. Real time saved.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {[
            { q: "I cut my email triage time in half. Asking Claude to summarise threads is a cheat code.", a: "Maya R.", role: "Product Manager" },
            { q: "Finally, my Gmail and Outlook in one place. The smart search just works.", a: "Daniel K.", role: "Freelance Designer" },
            { q: "The voice-to-email on mobile is unreal. I dictate replies between meetings.", a: "Priya S.", role: "Sales Lead" },
          ].map(t => (
            <div
              key={t.a}
              style={{
                backgroundColor: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: 16,
                padding: 24,
              }}
            >
              <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <Star key={i} size={13} color="#fbbf24" fill="#fbbf24" />
                ))}
              </div>
              <p style={{ fontSize: 15, color: FG, margin: "0 0 16px", lineHeight: 1.6 }}>
                &ldquo;{t.q}&rdquo;
              </p>
              <p style={{ fontSize: 13, color: FG_MUTED, margin: 0 }}>
                <span style={{ color: FG, fontWeight: 600 }}>{t.a}</span> · {t.role}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "0 24px 96px", maxWidth: 820, margin: "0 auto", scrollMarginTop: 80 }}>
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
              onClick={() => goSignUp("pricing_free")}
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
              onClick={() => goSignUp("pricing_pro")}
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
              Get started
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
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: FG_SUBTLE, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Shield size={13} /> 7-day money-back guarantee · cancel anytime
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "0 24px 96px", maxWidth: 760, margin: "0 auto", scrollMarginTop: 80 }}>
        <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 700, marginBottom: 12, color: FG }}>
          Frequently asked questions
        </h2>
        <p style={{ textAlign: "center", color: FG_MUTED, marginBottom: 40, fontSize: 16 }}>
          Everything you need to know before signing up.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { q: "Is PinnboxIO free?", a: "Yes. The Free plan includes Gmail and Outlook inbox, 20 AI requests per day, 1 GB cloud storage, calendar sync and the mobile app — with no credit card required." },
            { q: "Which AI models does PinnboxIO support?", a: "PinnboxIO works with OpenAI GPT-4o, Anthropic Claude, and Google Gemini. You can pick the best model for any task from the AI tab." },
            { q: "Does it work with both Gmail and Outlook?", a: "Yes. Connect one or more Gmail and Outlook accounts and read, reply, search and draft across all of them from a single unified inbox." },
            { q: "How much does Pro cost?", a: "Pro is $7.99/month or $59.99/year (save 37%). It unlocks unlimited AI requests, 25 GB cloud storage, all AI models and priority support." },
            { q: "Is my email data secure?", a: "Yes. PinnboxIO uses OAuth to connect to Gmail and Outlook, never stores your password, and only accesses the scopes you explicitly approve. You can disconnect any account at any time." },
          ].map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={item.q}
                style={{
                  backgroundColor: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => {
                    setOpenFaq(isOpen ? null : i);
                    if (!isOpen) trackEvent("faq_open", { question: item.q });
                  }}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    cursor: "pointer",
                    color: FG,
                    fontSize: 15,
                    fontWeight: 600,
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={18}
                    style={{
                      flexShrink: 0,
                      transition: "transform 0.2s",
                      transform: isOpen ? "rotate(180deg)" : "none",
                      color: FG_MUTED,
                    }}
                  />
                </button>
                {isOpen && (
                  <div style={{ padding: "0 20px 18px", fontSize: 14, color: FG_MUTED, lineHeight: 1.7 }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA + share */}
      <section style={{ padding: "0 24px 80px", maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <div
          style={{
            backgroundColor: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 20,
            padding: "40px 28px",
          }}
        >
          <h2 style={{ fontSize: 26, fontWeight: 700, color: FG, margin: "0 0 10px" }}>
            Ready to tame your inbox?
          </h2>
          <p style={{ fontSize: 15, color: FG_MUTED, margin: "0 0 24px" }}>
            Set up in under a minute. No credit card required.
          </p>
          <button
            onClick={() => goSignUp("final_cta")}
            style={{
              backgroundColor: PRIMARY,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "14px 28px",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 20px rgba(59,130,246,0.4)",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = PRIMARY_HOVER)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = PRIMARY)}
          >
            Get started free <ArrowRight size={16} />
          </button>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 13, color: FG_SUBTLE, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>
              Tell a friend
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => share("twitter")}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: SURFACE2, color: FG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = FG_SUBTLE)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
                aria-label="Share on Twitter"
              >
                <Twitter size={15} /> Tweet
              </button>
              <button
                onClick={() => share("linkedin")}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: SURFACE2, color: FG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = FG_SUBTLE)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
                aria-label="Share on LinkedIn"
              >
                <Linkedin size={15} /> Share
              </button>
              <button
                onClick={() => share("copy")}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: SURFACE2, color: FG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = FG_SUBTLE)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
                aria-label="Copy link"
              >
                <LinkIcon size={15} /> {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
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
