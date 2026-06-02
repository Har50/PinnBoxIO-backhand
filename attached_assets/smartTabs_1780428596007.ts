import { Platform } from "react-native";

export type SmartCategory = "action_required" | "fyi" | "updates" | "promotions" | "all";

export const SMART_TABS: { key: SmartCategory; label: string; icon: string }[] = [
  { key: "all", label: "All Mail", icon: "inbox" },
  { key: "action_required", label: "Action", icon: "alert-circle" },
  { key: "fyi", label: "FYI", icon: "info" },
  { key: "updates", label: "Updates", icon: "bell" },
  { key: "promotions", label: "Promos", icon: "tag" },
];

const CATEGORY_KEYWORDS: Record<SmartCategory, string[]> = {
  all: [],
  action_required: ["action required", "urgent", "asap", "deadline", "response needed", "review", "approve", "sign off", "feedback requested", "please reply", "waiting for", "todo", "to-do", "to do", "reminder", "follow-up"],
  fyi: ["fyi", "for your information", "for your reference", "update", "thought you", "check out", "notice", "announcement"],
  updates: ["newsletter", "weekly digest", "monthly report", "status update", "progress", "release notes", "changelog", "what's new", "product update", "new version"],
  promotions: ["sale", "offer", "discount", "promo", "coupon", "deal", "limited time", "free trial", "subscribe", "unlock", "upgrade", "special offer"],
};

export function categorizeEmail(subject: string, body: string, fromName: string, fromEmail: string): SmartCategory {
  const text = `${subject} ${body} ${fromName} ${fromEmail}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "all") continue;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        return category as SmartCategory;
      }
    }
  }

  if (/\b(meet|meeting|call|demo|interview|appointment)\b/.test(text)) return "action_required";
  if (/\b(invoice|receipt|bill|payment|order|shipping|delivered)\b/.test(text)) return "updates";
  if (/\b(unsubscribe|marketing|promo|sale|percent off|save)\b/i.test(text)) return "promotions";

  return "fyi";
}

export function smartCategoryIcon(cat: SmartCategory): string {
  const icons: Record<SmartCategory, string> = {
    all: "📬",
    action_required: "🔴",
    fyi: "ℹ️",
    updates: "🔔",
    promotions: "🏷️",
  };
  return icons[cat] || "📬";
}
