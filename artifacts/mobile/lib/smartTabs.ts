export type SmartTabKey = "action" | "fyi" | "updates" | "promos";

export interface SmartTabInfo {
  key: SmartTabKey;
  label: string;
  icon: string;
  color: string;
}

export const SMART_TABS: SmartTabInfo[] = [
  { key: "action",  label: "Action Required", icon: "alert-circle",  color: "#ef4444" },
  { key: "fyi",     label: "FYI",             icon: "info",          color: "#3b82f6" },
  { key: "updates", label: "Updates",         icon: "refresh-cw",   color: "#10b981" },
  { key: "promos",  label: "Promos",          icon: "tag",           color: "#f59e0b" },
];

const ACTION_KEYWORDS = [
  "urgent", "action required", "please review", "your approval",
  "asap", "deadline", "overdue", "reminder", "follow up", "follow-up",
  "respond", "confirm", "invoice", "payment due", "verify", "sign",
  "respond by", "action needed", "pending", "awaiting", "complete",
];

const FYI_KEYWORDS = [
  "fyi", "for your information", "heads up", "just a note", "letting you know",
  "no action needed", "for reference", "meeting notes", "summary", "recap",
  "update:", "announcement", "newsletter",
];

const UPDATES_KEYWORDS = [
  "shipped", "delivered", "tracking", "order", "confirmed", "booked",
  "reservation", "receipt", "transaction", "statement", "notification",
  "alert", "your account", "security", "password", "signed in",
  "github", "jira", "slack", "deployment", "build", "pr ", "pull request",
  "mention", "assigned", "review requested",
];

const PROMO_KEYWORDS = [
  "% off", "discount", "sale", "offer", "deal", "promo", "coupon",
  "subscribe", "unsubscribe", "marketing", "special offer", "limited time",
  "free shipping", "black friday", "cyber monday", "flash sale",
  "shop now", "buy now", "exclusive", "members only", "rewards",
];

export function categorizeMessage(subject: string, fromEmail: string, bodySnippet: string): SmartTabKey {
  const text = `${subject} ${fromEmail} ${bodySnippet}`.toLowerCase();

  const promoScore  = PROMO_KEYWORDS.filter(k => text.includes(k)).length;
  const actionScore = ACTION_KEYWORDS.filter(k => text.includes(k)).length;
  const fyiScore    = FYI_KEYWORDS.filter(k => text.includes(k)).length;
  const updatesScore = UPDATES_KEYWORDS.filter(k => text.includes(k)).length;

  if (promoScore > 0 && promoScore >= actionScore) return "promos";
  if (actionScore >= 2) return "action";
  if (updatesScore >= 2) return "updates";
  if (fyiScore >= 1) return "fyi";
  if (actionScore >= 1) return "action";
  if (updatesScore >= 1) return "updates";

  return "fyi";
}

export interface CategorizedMessage {
  id: number;
  category: SmartTabKey;
}

export function categorizeMessages(
  messages: Array<{ id: number; subject: string; fromEmail: string; bodyText?: string | null }>
): CategorizedMessage[] {
  return messages.map(m => ({
    id: m.id,
    category: categorizeMessage(m.subject, m.fromEmail, m.bodyText?.slice(0, 200) ?? ""),
  }));
}
