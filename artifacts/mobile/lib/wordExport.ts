import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Linking from "expo-linking";

function emailToHtmlDoc(subject: string, fromName: string, fromEmail: string, date: string, body: string): string {
  return `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${subject}</title></head>
<body>
<h2>${subject}</h2>
<p><b>From:</b> ${fromName} &lt;${fromEmail}&gt;<br/>
<b>Date:</b> ${date}</p>
<hr/>
<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.6'>
${body.replace(/\n/g, "<br/>")}
</div>
</body>
</html>`;
}

export interface WordExportOptions {
  subject: string;
  fromName: string;
  fromEmail: string;
  date: string;
  body: string;
}

export async function exportAsWord(opts: WordExportOptions): Promise<void> {
  const html = emailToHtmlDoc(opts.subject, opts.fromName, opts.fromEmail, opts.date, opts.body);
  const safeSubject = opts.subject.replace(/[^a-zA-Z0-9_\- ]/g, "").trim().slice(0, 40) || "email";
  const filename = `${safeSubject}.doc`;

  if (Platform.OS === "web") {
    if (typeof window === "undefined") return;
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
    return;
  }

  const path = (FileSystem.cacheDirectory ?? "") + filename;
  await FileSystem.writeAsStringAsync(path, html, { encoding: FileSystem.EncodingType.UTF8 });
  await Linking.openURL(path);
}
