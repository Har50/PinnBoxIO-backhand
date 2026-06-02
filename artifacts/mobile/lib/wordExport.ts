import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDocxHtml(content: {
  title: string;
  from?: string;
  to?: string;
  date?: string;
  body: string;
}): string {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<title>${escapeHtml(content.title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a; margin: 2.5cm; }
  h1 { font-size: 18pt; color: #2563eb; margin-bottom: 4pt; }
  .meta { color: #64748b; font-size: 10pt; margin-bottom: 2pt; }
  .separator { border: none; border-top: 1px solid #e2e8f0; margin: 16pt 0; }
  .body-content { margin-top: 12pt; white-space: pre-wrap; }
</style>
</head>
<body>
  <h1>${escapeHtml(content.title)}</h1>
  ${content.from ? `<div class="meta">From: ${escapeHtml(content.from)}</div>` : ""}
  ${content.to ? `<div class="meta">To: ${escapeHtml(content.to)}</div>` : ""}
  ${content.date ? `<div class="meta">Date: ${escapeHtml(content.date)}</div>` : ""}
  <hr class="separator">
  <div class="body-content">${escapeHtml(content.body).replace(/\n/g, "<br>")}</div>
</body></html>`;
}

export async function exportToWord(content: {
  title: string;
  from?: string;
  to?: string;
  date?: string;
  body: string;
}): Promise<void> {
  const html = buildDocxHtml(content);
  const blob = new Blob([html], { type: "application/msword" });

  if (Platform.OS === "web") {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${content.title.replace(/[^a-zA-Z0-9]/g, "_")}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    const fileName = `${content.title.replace(/[^a-zA-Z0-9]/g, "_")}.doc`;
    const localUri = FileSystem.cacheDirectory + fileName;
    await FileSystem.writeAsStringAsync(localUri, html);
    const { shareAsync } = await import("expo-sharing");
    await shareAsync(localUri, { mimeType: "application/msword", dialogTitle: "Save Document" });
  }
}

export async function exportEmailToWord(message: {
  subject: string;
  fromName: string;
  fromEmail: string;
  toList: string;
  bodyText?: string | null;
  receivedAt: string;
}): Promise<void> {
  const date = new Date(message.receivedAt);
  const formattedDate = date.toLocaleDateString([], {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  await exportToWord({
    title: message.subject || "Untitled",
    from: `${message.fromName} <${message.fromEmail}>`,
    to: message.toList,
    date: formattedDate,
    body: message.bodyText || "",
  });
}
