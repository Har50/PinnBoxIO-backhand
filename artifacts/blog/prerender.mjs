/**
 * Build-time SSG prerender.
 * Runs after:  vite build (client)  +  vite build --ssr (server)
 *
 * Fetches all published posts from the API server (or uses the bundled
 * fallback when the API is unreachable at build time), then renders each
 * route to dist/public/<path>/index.html so the Express server can serve
 * them as plain static files.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "dist/public");
const serverEntryPath = pathToFileURL(
  path.join(__dirname, "dist/server/entry-server.js"),
).href;

const BASE =
  (process.env.BASE_PATH ?? "/blog/").replace(/\/+$/, "") || "/blog";
const API_BASE = process.env.BLOG_API_BASE ?? "http://localhost:80";
const SITE_ORIGIN =
  process.env.BLOG_SITE_ORIGIN ?? "https://pinnboxio.net";

// ── Bundled fallback (used when the API is unreachable at build time) ──────

const FALLBACK_POST_DETAIL = {
  id: "welcome",
  slug: "welcome-to-pinnboxio-blog",
  title: "Welcome to the PinnboxIO Blog",
  excerpt:
    "Updates, product deep-dives, and productivity tips from the team building PinnboxIO.",
  coverImage: null,
  author: "PinnboxIO Team",
  publishedAt: new Date().toISOString(),
  tags: ["Product"],
  readingMinutes: 2,
  seoTitle: "Welcome to the PinnboxIO Blog",
  seoDescription:
    "Updates, product deep-dives, and productivity tips from the team building PinnboxIO.",
  aiSummary: null,
  bodyHtml: `
<p>Welcome to the official PinnboxIO blog — a place for product updates, productivity tips, and deep-dives into how we're building a calmer, smarter inbox.</p>
<h2>What is PinnboxIO?</h2>
<p>PinnboxIO brings together Gmail and Outlook in one unified inbox, with AI models (GPT-4o, Claude, and Gemini) to help you triage faster, draft smarter, and search everything in plain English.</p>
<h2>What to expect here</h2>
<ul>
  <li><strong>Product updates</strong> — new features, improvements, and behind-the-scenes decisions.</li>
  <li><strong>Productivity tips</strong> — how to get more done with a calmer inbox.</li>
  <li><strong>Engineering notes</strong> — honest reflections on what we're building and why.</li>
</ul>
<p>We're glad you're here. More soon.</p>`.trim(),
};

const FALLBACK_POSTS = [
  {
    id: FALLBACK_POST_DETAIL.id,
    slug: FALLBACK_POST_DETAIL.slug,
    title: FALLBACK_POST_DETAIL.title,
    excerpt: FALLBACK_POST_DETAIL.excerpt,
    coverImage: FALLBACK_POST_DETAIL.coverImage,
    author: FALLBACK_POST_DETAIL.author,
    publishedAt: FALLBACK_POST_DETAIL.publishedAt,
    tags: FALLBACK_POST_DETAIL.tags,
    readingMinutes: FALLBACK_POST_DETAIL.readingMinutes,
    seoTitle: FALLBACK_POST_DETAIL.seoTitle,
    seoDescription: FALLBACK_POST_DETAIL.seoDescription,
    aiSummary: FALLBACK_POST_DETAIL.aiSummary,
  },
];

// ── Data fetching ──────────────────────────────────────────────────────────

async function apiFetch(pathname) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${pathname}`);
  return res.json();
}

async function fetchPosts() {
  try {
    const data = await apiFetch("/api/blog/posts");
    const posts = data.posts ?? [];
    if (posts.length > 0) return posts;
    console.warn("[prerender] API returned 0 posts, using fallback");
    return FALLBACK_POSTS;
  } catch (err) {
    console.warn(`[prerender] API unreachable (${err.message}), using fallback`);
    return FALLBACK_POSTS;
  }
}

async function fetchTags() {
  try {
    return await apiFetch("/api/blog/tags");
  } catch {
    return [{ name: "Product", count: 1 }];
  }
}

async function fetchPost(slug) {
  try {
    const res = await fetch(
      `${API_BASE}/api/blog/posts/${encodeURIComponent(slug)}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8_000) },
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return FALLBACK_POST_DETAIL.slug === slug ? FALLBACK_POST_DETAIL : null;
  }
}

// ── HTML assembly ──────────────────────────────────────────────────────────

const ANTI_FLASH = `<script>(function(){try{var t=localStorage.getItem('pinnboxio_theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();</script>`;

function prepareTemplate(raw) {
  return raw
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, "");
}

function assembleHtml(template, { html, headTags, state }) {
  return template
    .replace("</head>", `    ${headTags}\n  ${ANTI_FLASH}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`)
    .replace("</body>", `    ${state}\n  </body>`);
}

// ── File writing ───────────────────────────────────────────────────────────

function writeHtml(relPath, html) {
  const filePath = relPath
    ? path.join(publicDir, relPath, "index.html")
    : path.join(publicDir, "index.html");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, html, "utf-8");
  console.log(`[prerender] ✓ /${relPath || ""}`);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("[prerender] Starting SSG prerender...");

  const mod = await import(serverEntryPath);
  const render = mod.render;

  const rawTemplate = fs.readFileSync(
    path.join(publicDir, "index.html"),
    "utf-8",
  );
  const template = prepareTemplate(rawTemplate);

  const [posts, tags] = await Promise.all([fetchPosts(), fetchTags()]);

  // Home
  writeHtml(
    "",
    assembleHtml(
      template,
      render(`${BASE}/`, (qc) => {
        qc.setQueryData(["blogPosts"], { posts });
        qc.setQueryData(["blogPosts", "all"], { posts });
        qc.setQueryData(["blogTags"], tags);
      }),
    ),
  );

  // Static pages
  writeHtml("about", assembleHtml(template, render(`${BASE}/about`)));
  writeHtml(
    "bookmarks",
    assembleHtml(
      template,
      render(`${BASE}/bookmarks`, (qc) => {
        qc.setQueryData(["blogPosts", "all"], { posts });
      }),
    ),
  );

  // Category pages
  const tagNames = [...new Set(posts.flatMap((p) => p.tags ?? []))];
  for (const tag of tagNames) {
    const tagPosts = posts.filter((p) => (p.tags ?? []).includes(tag));
    writeHtml(
      `category/${tag}`,
      assembleHtml(
        template,
        render(`${BASE}/category/${encodeURIComponent(tag)}`, (qc) => {
          qc.setQueryData(["blogPosts", { tag }], { posts: tagPosts });
        }),
      ),
    );
  }

  // Individual post pages
  for (const summary of posts) {
    const post = await fetchPost(summary.slug);
    if (!post) {
      console.warn(`[prerender] Skipping ${summary.slug} — detail fetch failed`);
      continue;
    }
    writeHtml(
      summary.slug,
      assembleHtml(
        template,
        render(`${BASE}/${summary.slug}`, (qc) => {
          qc.setQueryData(["blogPost", summary.slug], post);
        }),
      ),
    );
  }

  // Sitemap
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
  console.log("[prerender] ✓ sitemap.xml");

  // Robots
  fs.writeFileSync(
    path.join(publicDir, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}${BASE}/sitemap.xml\n`,
    "utf-8",
  );
  console.log("[prerender] ✓ robots.txt");

  console.log(
    `[prerender] Done — ${posts.length} post(s) prerendered to dist/public/`,
  );
}

main().catch((err) => {
  console.error("[prerender] Fatal:", err);
  process.exit(1);
});
