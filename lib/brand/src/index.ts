export const APP_NAME = "PinnboxIO";

export const APP_TAGLINE =
  "Your unified communications workspace — email, contacts, and messages in one place.";

export const LOGIN_TAGLINE = "Sign in to your unified\ncommunications hub";

export const FEATURE_LABELS = [
  "Unified email inbox across all accounts",
  "Smart contact management",
  "Global message search",
] as const;

export const brand = {
  primary: "#3b82f6",
  primaryHover: "#2563eb",
  primaryForeground: "#ffffff",
  primaryShadow: "rgba(59,130,246,0.35)",
  primaryButtonShadow: "rgba(59,130,246,0.3)",

  dark: {
    background: "#0f172a",
    surface: "#1e293b",
    surfaceDeep: "#1e3a5f",
    foreground: "#f1f5f9",
    foregroundMuted: "#94a3b8",
    foregroundSubtle: "#e2e8f0",
    border: "#1e293b",
    footerText: "#64748b",
    footerLinkHover: "#cbd5e1",
  },

  light: {
    background: "#ffffff",
    foreground: "#0f172a",
    card: "#f8fafc",
    cardForeground: "#0f172a",
    secondary: "#f1f5f9",
    secondaryForeground: "#0f172a",
    muted: "#f1f5f9",
    mutedForeground: "#64748b",
    accent: "#eff6ff",
    accentForeground: "#1e40af",
    border: "#e2e8f0",
    input: "#e2e8f0",
  },

  error: {
    background: "#fef2f2",
    border: "#fecaca",
    foreground: "#dc2626",
  },

  success: "#22c55e",
  successLight: "#f0fdf4",

  emerald: "#10b981",
  emeraldLight: "#ecfdf5",

  amber: "#f59e0b",
  amberLight: "#fffbeb",

  unread: "#ef4444",
  unreadLight: "#fef2f2",
} as const;
