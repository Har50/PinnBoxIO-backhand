import { brand } from "@workspace/brand";

const colors = {
  light: {
    text: brand.light.foreground,
    tint: brand.primary,

    background: brand.light.background,
    foreground: brand.light.foreground,

    card: brand.light.card,
    cardForeground: brand.light.cardForeground,

    primary: brand.primary,
    primaryForeground: brand.primaryForeground,

    secondary: brand.light.secondary,
    secondaryForeground: brand.light.secondaryForeground,

    muted: brand.light.muted,
    mutedForeground: brand.light.mutedForeground,

    accent: brand.light.accent,
    accentForeground: brand.light.accentForeground,

    destructive: brand.unread,
    destructiveForeground: brand.primaryForeground,

    border: brand.light.border,
    input: brand.light.input,

    success: brand.success,
    successLight: brand.successLight,

    emerald: brand.emerald,
    emeraldLight: brand.emeraldLight,

    amber: brand.amber,
    amberLight: brand.amberLight,

    unread: brand.unread,
    unreadLight: brand.unreadLight,
  },
  dark: {
    text: "#f8fafc",
    tint: brand.primary,

    background: brand.dark.background,
    foreground: "#f8fafc",

    card: "#111827",
    cardForeground: "#f8fafc",

    primary: brand.primary,
    primaryForeground: brand.dark.background,

    secondary: brand.dark.surface,
    secondaryForeground: "#f8fafc",

    muted: brand.dark.surface,
    mutedForeground: brand.dark.foregroundMuted,

    accent: "#1d4ed8",
    accentForeground: "#dbeafe",

    destructive: "#f87171",
    destructiveForeground: brand.dark.background,

    border: "#334155",
    input: "#334155",

    success: brand.success,
    successLight: "#052e16",

    emerald: "#34d399",
    emeraldLight: "#064e3b",

    amber: "#fbbf24",
    amberLight: "#451a03",

    unread: "#f87171",
    unreadLight: "#450a0a",
  },
  radius: 10,
};

export default colors;
