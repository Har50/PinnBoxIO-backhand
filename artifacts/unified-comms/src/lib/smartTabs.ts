export type TabKey = "all" | "unread" | "starred" | "sent" | "drafts" | "saved" | "spam" | "trash";

export interface SmartTabSuggestion {
  key: TabKey;
  reason: string;
}

export interface MessageSummary {
  isRead: boolean;
  isStarred: boolean;
  folder: string;
  receivedAt: string;
  fromEmail?: string;
  subject?: string;
}

export function getSmartTabSuggestions(
  messages: MessageSummary[],
  currentTab: TabKey
): SmartTabSuggestion[] {
  const suggestions: SmartTabSuggestion[] = [];

  const unreadCount = messages.filter((m) => !m.isRead).length;
  const starredCount = messages.filter((m) => m.isStarred).length;

  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentUnread = messages.filter(
    (m) => !m.isRead && new Date(m.receivedAt).getTime() > oneHourAgo
  ).length;

  if (unreadCount > 10 && currentTab !== "unread") {
    suggestions.push({ key: "unread", reason: `${unreadCount} unread messages` });
  }

  if (recentUnread > 0 && currentTab !== "unread") {
    suggestions.push({ key: "unread", reason: `${recentUnread} new in the last hour` });
  }

  if (starredCount > 0 && currentTab !== "starred") {
    suggestions.push({ key: "starred", reason: `${starredCount} starred messages` });
  }

  const unique = new Map<TabKey, SmartTabSuggestion>();
  for (const s of suggestions) {
    if (!unique.has(s.key)) unique.set(s.key, s);
  }

  return Array.from(unique.values()).slice(0, 2);
}

export interface TabBadge {
  key: TabKey;
  count: number;
  variant: "unread" | "total";
}

export function getTabBadges(
  messages: MessageSummary[],
  folderCountMap: Map<string, { unread: number; total: number }>
): Map<TabKey, number> {
  const badges = new Map<TabKey, number>();

  const unread = folderCountMap.get("Inbox")?.unread ?? messages.filter((m) => !m.isRead).length;
  if (unread > 0) badges.set("unread", unread);

  const drafts = folderCountMap.get("Drafts")?.total ?? 0;
  if (drafts > 0) badges.set("drafts", drafts);

  const spam = folderCountMap.get("Spam")?.unread ?? 0;
  if (spam > 0) badges.set("spam", spam);

  return badges;
}
