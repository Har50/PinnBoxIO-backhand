export interface WordExportOptions {
  title?: string;
  subject?: string;
  from?: string;
  date?: string;
  body: string;
  isHtml?: boolean;
}

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText || div.textContent || "";
}

export function exportAsWord(options: WordExportOptions): void {
  const { title = "Email", subject, from, date, body, isHtml = false } = options;

  const bodyContent = isHtml
    ? body
    : body
        .split("\n")
        .map((line) => `<p>${line || "&nbsp;"}</p>`)
        .join("");

  const metaRows = [
    subject ? `<tr><td style="font-weight:bold;padding:4px 8px;width:80px">Subject:</td><td style="padding:4px 8px">${subject}</td></tr>` : "",
    from ? `<tr><td style="font-weight:bold;padding:4px 8px">From:</td><td style="padding:4px 8px">${from}</td></tr>` : "",
    date ? `<tr><td style="font-weight:bold;padding:4px 8px">Date:</td><td style="padding:4px 8px">${date}</td></tr>` : "",
  ]
    .filter(Boolean)
    .join("");

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml>
      <![endif]-->
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; margin: 2cm; color: #1a1a1a; }
        table { border-collapse: collapse; margin-bottom: 16pt; }
        td { vertical-align: top; font-size: 10pt; }
        h1 { font-size: 16pt; font-weight: bold; margin-bottom: 8pt; }
        p { margin: 6pt 0; line-height: 1.4; }
        hr { border: none; border-top: 1px solid #ccc; margin: 12pt 0; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${metaRows ? `<table>${metaRows}</table><hr />` : ""}
      <div>${bodyContent}</div>
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], {
    type: "application/msword",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const filename = (subject || title).replace(/[^a-z0-9 _-]/gi, "").trim().slice(0, 60) || "email";
  a.href = url;
  a.download = `${filename}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTextAsWord(text: string, filename = "export"): void {
  exportAsWord({ title: filename, body: text, isHtml: false });
}

export function exportHtmlAsWord(html: string, filename = "export"): void {
  exportAsWord({ title: filename, body: html, isHtml: true });
}
