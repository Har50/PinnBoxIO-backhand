/**
 * PinnboxIO Blog — SSG static-file server with background refresh.
 *
 * At startup it serves the static HTML files written by prerender.mjs.
 * For routes not yet on disk (new posts published since the last build) it
 * falls back to SSR and writes the result to disk for subsequent requests.
 * A background job re-renders all known routes every BLOG_PAGE_TTL_MS
 * (default 5 min) so Notion content appears without a full redeploy.
 */
import express, { type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { QueryClient } from "@tanstack/react-query";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
// Running from dist/server-bundle/index.mjs → parent is dist/
const distDir = path.resolve(moduleDir, "..");
const publicDir = path.join(distDir, "public");
const serverEntryUrl = pathToFileURL(
  path.join(distDir, "server", "entry-server.js"),
).href;

const BASE =
  (process.env.BASE_PATH ?? "/blog/").replace(/\/+$/, "") || "/blog";
const SITE_ORIGIN =
  process.env.BLOG_SITE_ORIGIN ?? "https://pinnboxio.net";
const PORT = Number(process.env.PORT ?? 18790);
const REFRESH_MS = Number(
  process.env.BLOG_PAGE_TTL_MS ?? String(5 * 60 * 1000),
);
const API_BASE =
  process.env.BLOG_API_BASE ??
  (process.env.NODE_ENV === "production" && process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0].trim()}`
    : "http://localhost:80");

// ── Types ──────────────────────────────────────────────────────────────────

interface BlogPost {
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
interface BlogPostDetail extends BlogPost {
  bodyHtml: string;
}
type RenderFn = (
  fullPath: string,
  seed?: (qc: QueryClient) => void,
) => { html: string; headTags: string; state: string };

// ── Data fetching ──────────────────────────────────────────────────────────

async function apiFetch(pathname: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}${pathname}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${pathname}`);
  return res.json();
}

async function fetchPosts(): Promise<BlogPost[]> {
  const data = (await apiFetch("/api/blog/posts")) as { posts?: BlogPost[] };
  return data.posts ?? [];
}

async function fetchPost(slug: string): Promise<BlogPostDetail | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/blog/posts/${encodeURIComponent(slug)}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12_000) },
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as BlogPostDetail;
  } catch {
    return null;
  }
}

async function fetchTags(): Promise<{ name: string; count: number }[]> {
  try {
    return (await apiFetch("/api/blog/tags")) as { name: string; count: number }[];
  } catch {
    return [];
  }
}

// ── HTML assembly ──────────────────────────────────────────────────────────

const ANTI_FLASH = `<script>(function(){try{var t=localStorage.getItem('pinnboxio_theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();</script>`;

function prepareTemplate(raw: string): string {
  return raw
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, "");
}

function assemble(
  tmpl: string,
  r: { html: string; headTags: string; state: string },
): string {
  return tmpl
    .replace("</head>", `    ${r.headTags}\n  ${ANTI_FLASH}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${r.html}</div>`)
    .replace("</body>", `    ${r.state}\n  </body>`);
}

// ── Static file path helpers ───────────────────────────────────────────────

/**
 * Maps a route pathname (within BASE) to the corresponding HTML file on disk.
 *   "/"        → publicDir/index.html
 *   "/about"   → publicDir/about/index.html
 *   "/my-post" → publicDir/my-post/index.html
 */
function htmlFilePath(pathname: string): string {
  const clean = (pathname === "/" || pathname === "")
    ? ""
    : pathname.replace(/\/$/, "");
  return clean
    ? path.join(publicDir, clean, "index.html")
    : path.join(publicDir, "index.html");
}

// ── Render + write to disk ─────────────────────────────────────────────────

let renderFn: RenderFn | null = null;
let template: string | null = null;
let readyPromise: Promise<void> | null = null;

function renderToHtml(
  pathname: string,
  seed?: (qc: QueryClient) => void,
): string {
  if (!renderFn || !template) throw new Error("SSR not yet initialised");
  const fullPath = `${BASE}${pathname === "/" ? "/" : pathname}`;
  return assemble(template, renderFn(fullPath, seed));
}

async function waitReady(): Promise<void> {
  if (readyPromise) await readyPromise;
}

function writePage(pathname: string, html: string): void {
  const filePath = htmlFilePath(pathname);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, html, "utf-8");
}

// ── Background refresh ─────────────────────────────────────────────────────

let refreshing = false;

async function refresh(): Promise<void> {
  if (refreshing) return;
  refreshing = true;
  console.log("[blog-ssg] Background refresh started");
  try {
    const [posts, tags] = await Promise.all([fetchPosts(), fetchTags()]);

    // Home
    writePage(
      "/",
      renderToHtml("/", (qc) => {
        qc.setQueryData(["blogPosts"], { posts });
        qc.setQueryData(["blogPosts", "all"], { posts });
        qc.setQueryData(["blogTags"], tags);
      }),
    );

    // Static pages
    writePage("/about", renderToHtml("/about"));
    writePage(
      "/bookmarks",
      renderToHtml("/bookmarks", (qc) => {
        qc.setQueryData(["blogPosts", "all"], { posts });
      }),
    );

    // Category pages
    const tagNames = [...new Set(posts.flatMap((p) => p.tags ?? []))];
    for (const tag of tagNames) {
      const tagPosts = posts.filter((p) => (p.tags ?? []).includes(tag));
      writePage(
        `/category/${tag}`,
        renderToHtml(`/category/${encodeURIComponent(tag)}`, (qc) => {
          qc.setQueryData(["blogPosts", { tag }], { posts: tagPosts });
        }),
      );
    }

    // Post pages
    for (const summary of posts) {
      const post = await fetchPost(summary.slug);
      if (!post) continue;
      writePage(
        `/${summary.slug}`,
        renderToHtml(`/${summary.slug}`, (qc) => {
          qc.setQueryData(["blogPost", summary.slug], post);
        }),
      );
    }

    // Regenerate sitemap
    const sitemapUrls = [
      `${BASE}/`,
      `${BASE}/about`,
      ...posts.map((p) => `${BASE}/${p.slug}`),
    ];
    const sitemap = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...sitemapUrls.map(
        (u) =>
          `  <url><loc>${SITE_ORIGIN}${u}</loc><changefreq>weekly</changefreq></url>`,
      ),
      "</urlset>",
      "",
    ].join("\n");
    fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemap, "utf-8");

    console.log(
      `[blog-ssg] Refresh complete — ${posts.length} post(s) written to disk`,
    );
  } catch (err) {
    console.error("[blog-ssg] Background refresh failed:", String(err));
  } finally {
    refreshing = false;
  }
}

// ── Express app ────────────────────────────────────────────────────────────

function createApp(): express.Express {
  const app = express();
  app.disable("x-powered-by");

  const router = express.Router();

  router.get("/healthz", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Hashed build assets — immutable, long cache
  router.use(
    "/assets",
    express.static(path.join(publicDir, "assets"), {
      immutable: true,
      maxAge: "1y",
      index: false,
    }),
  );

  // Other static files (favicon, images, robots.txt, sitemap.xml, …).
  // index:false so we handle index.html ourselves below.
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

  // HTML pages — try pre-rendered file first, fall back to SSR.
  router.get(/.*/, async (req: Request, res: Response) => {
    const pathname = req.path || "/";
    const filePath = htmlFilePath(pathname);

    // ① Serve pre-rendered static file if it exists (no SSR needed)
    if (fs.existsSync(filePath)) {
      return res
        .set("Cache-Control", "public, max-age=0, must-revalidate")
        .type("html")
        .sendFile(filePath);
    }

    // Wait for SSR bundle to finish loading before attempting render
    await waitReady();

    // ② SSR fallback: for single-segment paths treat as potential post slug
    try {
      const slugMatch = pathname.match(/^\/([^/]+)\/?$/);
      if (
        slugMatch &&
        !["about", "bookmarks"].includes(slugMatch[1])
      ) {
        const slug = slugMatch[1];
        const post = await fetchPost(slug);
        if (!post) {
          // Unknown slug → 404
          const html = renderToHtml("/__not_found__");
          return res
            .status(404)
            .set("Cache-Control", "no-store")
            .type("html")
            .send(html);
        }
        const html = renderToHtml(`/${slug}`, (qc) => {
          qc.setQueryData(["blogPost", slug], post);
        });
        writePage(`/${slug}`, html);
        return res
          .status(200)
          .set("Cache-Control", "public, max-age=0, must-revalidate")
          .type("html")
          .send(html);
      }

      // ③ Generic SSR for any other missing page
      const html = renderToHtml(pathname);
      writePage(pathname, html);
      return res
        .status(200)
        .set("Cache-Control", "public, max-age=0, must-revalidate")
        .type("html")
        .send(html);
    } catch (err) {
      console.error("[blog-ssg] render error", pathname, String(err));
      return res
        .status(500)
        .type("html")
        .send(
          "<!doctype html><meta charset=utf-8><title>Error</title><body>Something went wrong.</body>",
        );
    }
  });

  app.use(BASE, router);
  // Top-level healthz (outside BASE prefix) for the load balancer
  app.get("/healthz", (_req: Request, res: Response) => res.json({ ok: true }));

  return app;
}

// ── Boot ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Bind the port FIRST so Replit's health-check sees it immediately.
  const app = createApp();
  await new Promise<void>((resolve) => {
    app.listen(PORT, () => {
      console.log(
        `[blog-ssg] Listening on :${PORT}  base=${BASE}  api=${API_BASE}  refresh=${REFRESH_MS}ms`,
      );
      resolve();
    });
  });

  // Load the SSR bundle and template in the background.
  // Pre-rendered static files are served without waiting for this.
  readyPromise = (async () => {
    template = prepareTemplate(
      fs.readFileSync(path.join(publicDir, "index.html"), "utf-8"),
    );
    const mod = (await import(serverEntryUrl)) as { render: RenderFn };
    renderFn = mod.render;
    console.log("[blog-ssg] SSR bundle loaded — SSR fallback active");
    // Schedule background refresh — keeps static files up-to-date with Notion
    setInterval(() => void refresh(), REFRESH_MS);
  })();

  readyPromise.catch((err) => {
    console.error("[blog-ssg] SSR bundle load failed:", err);
  });
}

main().catch((err) => {
  console.error("[blog-ssg] Fatal startup error:", err);
  process.exit(1);
});
