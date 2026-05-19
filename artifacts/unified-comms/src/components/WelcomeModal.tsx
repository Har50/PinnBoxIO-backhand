import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { X, Zap, Check } from "lucide-react";

const STORAGE_KEY = "has_seen_welcome";
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const proBenefits = [
  "Unlimited AI requests (GPT-4o, Claude, Gemini)",
  "25 GB cloud storage",
  "Voice to Email",
  "All AI models — including latest releases",
];

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
  }

  function upgrade() {
    dismiss();
    setLocation(`${basePath}/settings`);
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div
        style={{
          backgroundColor: "#111827",
          border: "1px solid #1f2d45",
          borderRadius: 20,
          padding: "32px",
          maxWidth: 460,
          width: "100%",
          position: "relative",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        <button
          onClick={dismiss}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#64748b",
            padding: 4,
            borderRadius: 6,
            display: "flex",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
          onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: "0 0 8px" }}>
            Welcome to PinnboxIO 👋
          </h2>
          <p style={{ fontSize: 14, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>
            You're on the <strong style={{ color: "#f1f5f9" }}>Free plan</strong> — 20 AI requests/day, 1 GB storage.
          </p>
        </div>

        <div
          style={{
            backgroundColor: "#0f1e35",
            border: "1px solid #1e3a5f",
            borderRadius: 12,
            padding: "20px",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Zap size={14} color="#fff" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Pro unlocks
            </span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {proBenefits.map(b => (
              <li key={b} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#cbd5e1" }}>
                <Check size={15} color="#3b82f6" style={{ flexShrink: 0, marginTop: 1 }} />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={upgrade}
            style={{
              backgroundColor: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "13px 0",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              width: "100%",
              boxShadow: "0 4px 16px rgba(59,130,246,0.35)",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#2563eb")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#3b82f6")}
          >
            Upgrade to Pro — $7.99/mo
          </button>
          <button
            onClick={dismiss}
            style={{
              backgroundColor: "transparent",
              color: "#64748b",
              border: "1px solid #1f2d45",
              borderRadius: 10,
              padding: "12px 0",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              width: "100%",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "#334155"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.borderColor = "#1f2d45"; }}
          >
            Start with Free
          </button>
        </div>
      </div>
    </div>
  );
}
