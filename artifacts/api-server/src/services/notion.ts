import { Client, isFullPage } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { logger } from "../lib/logger";

type NotionPageProperties = Record<string, any>;

export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  author: string | null;
  publishedAt: string | null;
  tags: string[];
  readingMinutes: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  aiSummary: string | null;
}

export interface BlogPostDetail extends BlogPostSummary {
  bodyHtml: string;
}

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID =
  process.env.NOTION_BLOG_DATABASE_ID ?? "36eb1830-24de-806f-bf7d-fb76672f51d1";

let cachedClient: Client | null = null;
let cachedN2M: NotionToMarkdown | null = null;
let cachedDataSourceId: string | null = null;

async function getDataSourceId(): Promise<string> {
  if (cachedDataSourceId) return cachedDataSourceId;
  const client = getClient();
  const db: any = await client.databases.retrieve({
    database_id: NOTION_DATABASE_ID,
  });
  const ds = db?.data_sources?.[0]?.id;
  if (!ds) {
    throw new Error("Notion database has no data sources");
  }
  cachedDataSourceId = ds;
  return ds;
}

function getClient(): Client {
  if (!NOTION_API_KEY) {
    throw new Error(
      "NOTION_API_KEY is not configured — the blog cannot fetch posts.",
    );
  }
  if (!cachedClient) {
    cachedClient = new Client({ auth: NOTION_API_KEY });
  }
  return cachedClient;
}

function getN2M(): NotionToMarkdown {
  if (!cachedN2M) {
    cachedN2M = new NotionToMarkdown({ notionClient: getClient() });
  }
  return cachedN2M;
}

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

function mapPage(page: any): BlogPostSummary {
  const props: NotionPageProperties = page.properties ?? {};
  const title =
    readPropString(props, "Name") ||
    readPropString(props, "Title") ||
    "Untitled";
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

function estimateReadingMinutes(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const TTL_MS = 60_000;
const listCache = new Map<string, CacheEntry<BlogPostSummary[]>>();
const postCache = new Map<string, CacheEntry<BlogPostDetail>>();

function cacheGet<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    map.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet<T>(
  map: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
): void {
  map.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

export async function listPublishedPosts(opts: {
  tag?: string | null;
  limit?: number | null;
}): Promise<BlogPostSummary[]> {
  const cacheKey = `t=${opts.tag ?? ""}|l=${opts.limit ?? ""}`;
  const cached = cacheGet(listCache, cacheKey);
  if (cached) return cached;

  const client = getClient();
  const filters: any[] = [
    {
      property: "Status",
      status: { equals: "Published" },
    },
  ];
  if (opts.tag) {
    filters.push({ property: "Tags", multi_select: { contains: opts.tag } });
  }

  const dataSourceId = await getDataSourceId();
  const pageSize = Math.min(Math.max(opts.limit ?? 50, 1), 100);

  async function runQuery(activeFilters: any[]): Promise<any> {
    return await (client as any).dataSources.query({
      data_source_id: dataSourceId,
      filter: activeFilters.length === 1 ? activeFilters[0] : { and: activeFilters },
      sorts: [{ property: "Publish Date", direction: "descending" }],
      page_size: pageSize,
    });
  }

  let response: any;
  try {
    response = await runQuery(filters);
  } catch (err: any) {
    const msg = String(err?.message ?? "");
    // If 'Status' is a select instead of status, retry with select filter
    if (msg.includes("status") || msg.includes("Status")) {
      const altFilters = filters.map((f) =>
        f.property === "Status"
          ? { property: "Status", select: { equals: "Published" } }
          : f,
      );
      try {
        response = await runQuery(altFilters);
      } catch {
        // Last resort: drop status filter; we'll filter in-memory
        response = await runQuery(filters.filter((f) => f.property !== "Status"));
      }
    } else if (msg.includes("sort") || msg.includes("Publish Date")) {
      // Sort property may not exist; retry without sort
      response = await (client as any).dataSources.query({
        data_source_id: dataSourceId,
        filter: filters.length === 1 ? filters[0] : { and: filters },
        page_size: pageSize,
      });
    } else {
      throw err;
    }
  }

  const posts = response.results
    .filter(isFullPage)
    .map((p: any) => mapPage(p));

  cacheSet(listCache, cacheKey, posts);
  return posts;
}

export async function getPostBySlug(
  slug: string,
): Promise<BlogPostDetail | null> {
  const cached = cacheGet(postCache, slug);
  if (cached) return cached;

  const all = await listPublishedPosts({ tag: null, limit: 100 });
  const match = all.find((p) => p.slug === slug);
  if (!match) return null;

  let bodyHtml = "";
  try {
    const n2m = getN2M();
    const mdBlocks = await n2m.pageToMarkdown(match.id);
    const md = n2m.toMarkdownString(mdBlocks);
    const rawMd = typeof md === "string" ? md : md.parent;
    const rendered = await marked.parse(rawMd ?? "", { async: true });
    bodyHtml = sanitizeHtml(rendered, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        "img",
        "h1",
        "h2",
        "figure",
        "figcaption",
      ]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ["src", "alt", "title", "width", "height", "loading"],
        a: ["href", "name", "target", "rel"],
        "*": ["id"],
      },
      allowedSchemes: ["http", "https", "mailto"],
      allowedSchemesByTag: { img: ["http", "https", "data"] },
      transformTags: {
        a: sanitizeHtml.simpleTransform("a", {
          rel: "noopener noreferrer",
        }),
      },
    });
  } catch (err) {
    logger.error({ err: String(err), slug }, "Failed to render Notion post body");
    bodyHtml = "<p>Unable to load post content.</p>";
  }

  const detail: BlogPostDetail = {
    ...match,
    readingMinutes: estimateReadingMinutes(bodyHtml),
    bodyHtml,
  };
  cacheSet(postCache, slug, detail);
  return detail;
}

export async function listTags(): Promise<Array<{ name: string; count: number }>> {
  const posts = await listPublishedPosts({ tag: null, limit: 100 });
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.tags) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
