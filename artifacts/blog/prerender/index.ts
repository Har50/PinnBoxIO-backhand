import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { QueryClient } from "@tanstack/react-query";
import { loadBlogData } from "./load-data";
import type { BlogPostDetail, BlogPostSummary } from "./types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const blogRoot = path.resolve(__dirname, "..");
const publicDir = path.join(blogRoot, "dist", "public");
const serverEntry = pathToFileURL(
  path.join(blogRoot, "dist", "server", "entry-server.js"),
).href;

const BASE = "/blog";
const SITE_ORIGIN = "https://pinnboxio.net";

type SeedFn = (qc: QueryClient) => void;
interface RenderResult {
  html: string;
  headTags: string;
  state: string;
}
type RenderFn = (fullPath: string, seed?: SeedFn) => RenderResult;

function toSummary(post: BlogPostDetail): BlogPostSummary {
  const { bodyHtml: _bodyHtml, ...summary } = post;
  return summary;
}

function prepareTemplate(raw: string): string {
  return raw
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:title"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:description"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:image"[^>]*>/gi, "");
}

function writePage(
  template: string,
  render: RenderFn,
  routePath: string,
  fileRelPath: string,
  seed?: SeedFn,
): void {
  const { html, headTags, state } = render(`${BASE}${routePath}`, seed);

  let out = template;
  out = out.replace("</head>", `    ${headTags}\n  </head>`);
  out = out.replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  out = out.replace("</body>", `    ${state}\n  </body>`);

  const fullPath = path.join(publicDir, fileRelPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, out, "utf-8");
  console.log(`[prerender] wrote ${fileRelPath}  (${routePath})`);
}

function writeSitemap(urls: string[]): void {
  const body = urls
    .map(
      (u) =>
        `  <url><loc>${SITE_ORIGIN}${u}</loc><changefreq>weekly</changefreq></url>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  fs.writeFileSync(path.join(publicDir, "sitemap.xml"), xml, "utf-8");
  console.log(`[prerender] wrote sitemap.xml (${urls.length} urls)`);
}

function writeRobots(): void {
  const txt = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/blog/sitemap.xml\n`;
  fs.writeFileSync(path.join(publicDir, "robots.txt"), txt, "utf-8");
  console.log("[prerender] wrote robots.txt");
}

async function main(): Promise<void> {
  const templateRaw = fs.readFileSync(
    path.join(publicDir, "index.html"),
    "utf-8",
  );
  const template = prepareTemplate(templateRaw);

  const { render }: { render: RenderFn } = await import(serverEntry);
  const { posts, tags } = await loadBlogData();
  const summaries = posts.map(toSummary);

  const sitemapUrls: string[] = [];

  // Home
  writePage(template, render, "/", "index.html", (qc) => {
    qc.setQueryData(["blogPosts"], { posts: summaries });
    qc.setQueryData(["blogPosts", "all"], { posts: summaries });
    qc.setQueryData(["blogTags"], tags);
  });
  sitemapUrls.push("/blog/");

  // About
  writePage(template, render, "/about", "about/index.html");
  sitemapUrls.push("/blog/about");

  // Bookmarks (client-only data, but pre-render the shell)
  writePage(template, render, "/bookmarks", "bookmarks/index.html", (qc) => {
    qc.setQueryData(["blogPosts", "all"], { posts: summaries });
  });

  // Category pages
  for (const tag of tags) {
    const tagPosts = summaries.filter((p) => p.tags.includes(tag.name));
    const route = `/category/${tag.name}`;
    writePage(
      template,
      render,
      route,
      `category/${tag.name}/index.html`,
      (qc) => {
        qc.setQueryData(["blogPosts", { tag: tag.name }], { posts: tagPosts });
      },
    );
  }

  // Post pages
  for (const post of posts) {
    const route = `/${post.slug}`;
    writePage(template, render, route, `${post.slug}/index.html`, (qc) => {
      qc.setQueryData(["blogPost", post.slug], post);
    });
    sitemapUrls.push(`/blog/${post.slug}`);
  }

  // 404 fallback page
  writePage(template, render, "/__not_found__", "404.html");

  writeSitemap(sitemapUrls);
  writeRobots();

  console.log(`[prerender] done — ${posts.length} post(s) pre-rendered.`);
}

main().catch((err) => {
  console.error("[prerender] FAILED:", err);
  process.exit(1);
});
