import express, { type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { QueryClient } from "@tanstack/react-query";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
// This bundle runs from artifacts/blog/dist/server-bundle/index.mjs
const distDir = path.resolve(moduleDir, "..");
const publicDir = path.join(distDir, "public");
const serverEntryUrl = pathToFileURL(
  path.join(distDir, "server", "entry-server.js"),
).href;

const BASE = (process.env.BASE_PATH ?? "/blog/").replace(/\/+$/, "") || "/blog";
const SITE_ORIGIN = process.env.BLOG_SITE_ORIGIN ?? "https://pinnboxio.net";
const PORT = Number(process.env.PORT ?? 18790);
const PAGE_TTL_MS = Number(process.env.BLOG_PAGE_TTL_MS ?? 5 * 60 * 1000);

// Where to read blog data from. In production we go through the public domain
// (which the shared proxy routes to the API server); in development we use the
// local shared proxy at :80.
const API_BASE =
  process.env.BLOG_API_BASE ??
  (process.env.NODE_ENV === "production" && process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0].trim()}`
    : "http://localhost:80");

interface RenderResult {
  html: string;
  headTags: string;
  state: string;
}
type SeedFn = (qc: QueryClient) => void;
type RenderFn = (fullPath: string, seed?: SeedFn) => RenderResult;

interface BlogPostSummary {
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
interface BlogPostDetail extends BlogPostSummary {
  bodyHtml: string;
}
interface BlogTag {
  name: string;
  count: number;
}

// --- Data access (from the API server, the single Notion source of truth) ---

async function apiFetch(pathname: string): Promise<globalThis.Response> {
  return fetch(`${API_BASE}${pathname}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
}

async function fetchPosts(tag?: string): Promise<BlogPostSummary[]> {
  const qs = tag ? `?tag=${encodeURIComponent(tag)}` : "";
  const res = await apiFetch(`/api/blog/posts${qs}`);
  if (!res.ok) throw new Error(`/api/blog/posts -> ${res.status}`);
  const data = (await res.json()) as { posts?: BlogPostSummary[] };
  return data.posts ?? [];
}

async function fetchTags(): Promise<BlogTag[]> {
  const res = await apiFetch(`/api/blog/tags`);
  if (!res.ok) throw new Error(`/api/blog/tags -> ${res.status}`);
  return (await res.json()) as BlogTag[];
}

async function fetchPost(slug: string): Promise<BlogPostDetail | null> {
  const res = await apiFetch(`/api/blog/posts/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`/api/blog/posts/${slug} -> ${res.status}`);
  return (await res.json()) as BlogPostDetail;
}

async function safePosts(tag?: string): Promise<BlogPostSummary[]> {
  try {
    return await fetchPosts(tag);
  } catch (err) {
    console.error("[blog-ssr] fetchPosts failed", String(err));
    return [];
  }
}

async function safeTags(): Promise<BlogTag[]> {
  try {
    return await fetchTags();
  } catch (err) {
    console.error("[blog-ssr] fetchTags failed", String(err));
    return [];
  }
}

// --- HTML template assembly ---

function prepareTemplate(raw: string): string {
  return raw
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:title"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:description"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:image"[^>]*>/gi, "");
}

const ANTI_FLASH_SCRIPT = `<script>(function(){try{var t=localStorage.getItem('pinnboxio_theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();</script>`;

function assemble(template: string, r: RenderResult): string {
  let out = template;
  out = out.replace("</head>", `    ${r.headTags}\n  ${ANTI_FLASH_SCRIPT}\n  </head>`);
  out = out.replace('<div id="root"></div>', `<div id="root">${r.html}</div>`);
  out = out.replace("</body>", `    ${r.state}\n  </body>`);
  return out;
}

let template = "";
let renderFn: RenderFn;

// --- Route → render ---

interface Rendered {
  html: string;
  status: number;
}

function renderNotFound(): Rendered {
  const r = renderFn(`${BASE}/__not_found__/page`);
  return { html: assemble(template, r), status: 404 };
}

async function renderRoute(pathname: string): Promise<Rendered> {
  if (pathname === "" || pathname === "/") {
    const [posts, tags] = await Promise.all([safePosts(), safeTags()]);
    const r = renderFn(`${BASE}/`, (qc) => {
      qc.setQueryData(["blogPosts"], { posts });
      qc.setQueryData(["blogPosts", "all"], { posts });
      qc.setQueryData(["blogTags"], tags);
    });
    return { html: assemble(template, r), status: 200 };
  }

  if (pathname === "/about") {
    const r = renderFn(`${BASE}/about`);
    return { html: assemble(template, r), status: 200 };
  }

  if (pathname === "/bookmarks") {
    const posts = await safePosts();
    const r = renderFn(`${BASE}/bookmarks`, (qc) => {
      qc.setQueryData(["blogPosts", "all"], { posts });
    });
    return { html: assemble(template, r), status: 200 };
  }

  const categoryMatch = pathname.match(/^\/category\/(.+?)\/?$/);
  if (categoryMatch) {
    const tag = decodeURIComponent(categoryMatch[1]);
    const tags = await safeTags();
    if (tags.length > 0 && !tags.some((t) => t.name === tag)) {
      return renderNotFound();
    }
    const posts = await safePosts(tag);
    const r = renderFn(`${BASE}/category/${tag}`, (qc) => {
      qc.setQueryData(["blogPosts", { tag }], { posts });
    });
    return { html: assemble(template, r), status: 200 };
  }

  const slugMatch = pathname.match(/^\/([^/]+)\/?$/);
  if (slugMatch) {
    const slug = decodeURIComponent(slugMatch[1]);
    const post = await fetchPost(slug);
    if (!post) return renderNotFound();
    const r = renderFn(`${BASE}/${slug}`, (qc) => {
      qc.setQueryData(["blogPost", slug], post);
    });
    return { html: assemble(template, r), status: 200 };
  }

  return renderNotFound();
}

// --- ISR cache: per-path HTML with stale-while-revalidate (~5 min) ---

interface CacheEntry {
  html: string;
  status: number;
  at: number;
  revalidating: boolean;
}
const pageCache = new Map<string, CacheEntry>();

async function getPage(pathname: string): Promise<Rendered> {
  const key = pathname || "/";
  const now = Date.now();
  const entry = pageCache.get(key);

  if (entry) {
    if (now - entry.at < PAGE_TTL_MS) {
      return { html: entry.html, status: entry.status };
    }
    if (!entry.revalidating) {
      entry.revalidating = true;
      renderRoute(pathname)
        .then((r) =>
          pageCache.set(key, { ...r, at: Date.now(), revalidating: false }),
        )
        .catch((err) => {
          entry.revalidating = false;
          console.error("[blog-ssr] revalidate failed", key, String(err));
        });
    }
    return { html: entry.html, status: entry.status };
  }

  const fresh = await renderRoute(pathname);
  pageCache.set(key, { ...fresh, at: Date.now(), revalidating: false });
  return fresh;
}

// --- Express app ---

function buildSitemap(posts: BlogPostSummary[]): string {
  const urls = [
    `${BASE}/`,
    `${BASE}/about`,
    ...posts.map((p) => `${BASE}/${p.slug}`),
  ];
  const body = urls
    .map(
      (u) =>
        `  <url><loc>${SITE_ORIGIN}${u}</loc><changefreq>weekly</changefreq></url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function createApp(): express.Express {
  const app = express();
  app.disable("x-powered-by");
  const router = express.Router();

  router.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  router.get("/robots.txt", (_req: Request, res: Response) => {
    res
      .type("text/plain")
      .send(
        `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}${BASE}/sitemap.xml\n`,
      );
  });

  router.get("/sitemap.xml", async (_req: Request, res: Response) => {
    const posts = await safePosts();
    res.type("application/xml").send(buildSitemap(posts));
  });

  // Hashed build assets — safe to cache aggressively.
  router.use(
    "/assets",
    express.static(path.join(publicDir, "assets"), {
      immutable: true,
      maxAge: "1y",
      index: false,
    }),
  );

  // Other public files (favicon, images). Never serve index.html directly.
  router.use(
    express.static(publicDir, {
      index: false,
      maxAge: "1h",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );

  // SSR catch-all (GET only).
  router.get(/.*/, async (req: Request, res: Response) => {
    try {
      const { html, status } = await getPage(req.path);
      res
        .status(status)
        .set("Cache-Control", "public, max-age=0, must-revalidate")
        .type("html")
        .send(html);
    } catch (err) {
      console.error("[blog-ssr] render error", req.path, String(err));
      res
        .status(500)
        .type("html")
        .send(
          "<!doctype html><meta charset=utf-8><title>Error</title><body>Something went wrong.</body>",
        );
    }
  });

  app.use(BASE, router);
  app.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  return app;
}

async function warm(): Promise<void> {
  const posts = await safePosts();
  const paths = [
    "/",
    "/about",
    "/bookmarks",
    ...posts.map((p) => `/${p.slug}`),
  ];
  await Promise.allSettled(paths.map((p) => getPage(p)));
  console.log(`[blog-ssr] warmed ${paths.length} page(s)`);
}

async function main(): Promise<void> {
  template = prepareTemplate(
    fs.readFileSync(path.join(publicDir, "index.html"), "utf-8"),
  );
  const mod = (await import(serverEntryUrl)) as { render: RenderFn };
  renderFn = mod.render;

  const app = createApp();
  app.listen(PORT, () => {
    console.log(
      `[blog-ssr] listening on ${PORT} base=${BASE} api=${API_BASE} ttl=${PAGE_TTL_MS}ms`,
    );
    void warm();
  });
}

main().catch((err) => {
  console.error("[blog-ssr] fatal", err);
  process.exit(1);
});
