import { Client, isFullPage } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { marked } from "marked";
import type { BlogPostDetail, BlogPostSummary } from "./types";

type NotionPageProperties = Record<string, any>;

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_BLOG_DATABASE_ID;

function plainText(rich: any): string {
  if (!Array.isArray(rich)) return "";
  return rich.map((r: any) => r?.plain_text ?? "").join("").trim();
}

function readPropString(props: NotionPageProperties, key: string): string | null {
  const p = props[key];
  if (!p) return null;
  switch (p.type) {
    case "title":
      return plainText(p.title) || null;
    case "rich_text":
      return plainText(p.rich_text) || null;
    case "url":
      return p.url ?? null;
    case "email":
      return p.email ?? null;
    case "select":
      return p.select?.name ?? null;
    case "status":
      return p.status?.name ?? null;
    case "date":
      return p.date?.start ?? null;
    case "people":
      return p.people?.[0]?.name ?? null;
    default:
      return null;
  }
}

function readPropTags(props: NotionPageProperties, key: string): string[] {
  const p = props[key];
  if (!p) return [];
  if (p.type === "multi_select") {
    return p.multi_select.map((t: any) => t.name).filter(Boolean);
  }
  if (p.type === "select" && p.select?.name) return [p.select.name];
  return [];
}

function readCoverImage(page: any, props: NotionPageProperties): string | null {
  const p = props["Featured Image"] ?? props["Cover Image"] ?? props["Cover"];
  if (p?.type === "files" && Array.isArray(p.files) && p.files.length > 0) {
    const f = p.files[0];
    return f.file?.url ?? f.external?.url ?? null;
  }
  if (p?.type === "url" && p.url) return p.url;
  if (page?.cover) {
    return page.cover.file?.url ?? page.cover.external?.url ?? null;
  }
  return null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function estimateReadingMinutes(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function mapPage(page: any): BlogPostSummary {
  const props: NotionPageProperties = page.properties ?? {};
  const title =
    readPropString(props, "Name") || readPropString(props, "Title") || "Untitled";
  const slugRaw = readPropString(props, "Slug");
  const slug = slugRaw ? slugify(slugRaw) : slugify(title) || page.id;

  return {
    id: page.id,
    slug,
    title,
    excerpt: readPropString(props, "Excerpt"),
    coverImage: readCoverImage(page, props),
    author: readPropString(props, "Author"),
    publishedAt:
      readPropString(props, "Publish Date") ??
      readPropString(props, "Published Date") ??
      readPropString(props, "Date"),
    tags: readPropTags(props, "Tags"),
    readingMinutes: null,
    seoTitle: readPropString(props, "SEO Title"),
    seoDescription: readPropString(props, "SEO Description"),
    aiSummary: readPropString(props, "AI Summary"),
  };
}

export function notionConfigured(): boolean {
  return Boolean(NOTION_API_KEY && NOTION_DATABASE_ID);
}

async function getDataSourceId(client: Client): Promise<string> {
  const db: any = await client.databases.retrieve({
    database_id: NOTION_DATABASE_ID as string,
  });
  const ds = db?.data_sources?.[0]?.id;
  if (!ds) {
    throw new Error("Notion database has no data sources");
  }
  return ds;
}

async function queryPublished(
  client: Client,
  dataSourceId: string,
): Promise<any[]> {
  const statusFilter = { property: "Status", status: { equals: "Published" } };
  const run = (filter: any, sort: boolean) =>
    (client as any).dataSources.query({
      data_source_id: dataSourceId,
      filter,
      ...(sort
        ? { sorts: [{ property: "Publish Date", direction: "descending" }] }
        : {}),
      page_size: 100,
    });

  try {
    const res = await run(statusFilter, true);
    return res.results;
  } catch (err: any) {
    const msg = String(err?.message ?? "");
    if (msg.includes("Status") || msg.includes("status")) {
      const res = await run(
        { property: "Status", select: { equals: "Published" } },
        false,
      );
      return res.results;
    }
    if (msg.includes("sort") || msg.includes("Publish Date")) {
      const res = await run(statusFilter, false);
      return res.results;
    }
    throw err;
  }
}

export async function fetchFromNotion(): Promise<BlogPostDetail[]> {
  const client = new Client({ auth: NOTION_API_KEY as string });
  const n2m = new NotionToMarkdown({ notionClient: client });
  const dataSourceId = await getDataSourceId(client);

  const rawPages = await queryPublished(client, dataSourceId);
  const summaries = rawPages.filter(isFullPage).map((p: any) => mapPage(p));

  const details: BlogPostDetail[] = [];
  for (const summary of summaries) {
    let html = "";
    try {
      const blocks = await n2m.pageToMarkdown(summary.id);
      const md = n2m.toMarkdownString(blocks);
      const rawMd = typeof md === "string" ? md : md.parent;
      html = await marked.parse(rawMd ?? "", { async: true });
    } catch {
      html = "<p>Unable to load post content.</p>";
    }
    details.push({
      ...summary,
      readingMinutes: estimateReadingMinutes(html),
      bodyHtml: html,
    });
  }

  return details;
}
