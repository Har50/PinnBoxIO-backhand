import type { BlogPostDetail } from "./types";

const bodyHtml = `
<p>Welcome to the PinnboxIO blog — the place where our team shares product updates, deep-dives into productivity, and honest stories about building a calmer way to communicate.</p>

<h2>Why we started this blog</h2>
<p>The modern professional's attention is fragmented across a dozen apps. Email lives in two or three inboxes, files are scattered across cloud drives, and context is lost in the gaps between tools. We built PinnboxIO to bring all of that back into one calm, focused workspace — and this blog is where we'll think out loud about how we do it.</p>

<h2>What you can expect</h2>
<ul>
  <li><strong>Product updates</strong> — new features, improvements, and the reasoning behind them.</li>
  <li><strong>Productivity essays</strong> — practical ideas for taming your inbox and protecting your focus.</li>
  <li><strong>Behind the scenes</strong> — how we design, build, and ship a unified communications tool.</li>
</ul>

<h2>Built for readers and search engines alike</h2>
<p>Every article here is pre-rendered to static HTML at build time. That means pages load instantly, work without JavaScript, and are fully visible to search engines from the very first byte — exactly what a content-driven blog should be.</p>

<p>Thanks for stopping by. There's plenty more on the way.</p>
`.trim();

export const welcomePost: BlogPostDetail = {
  id: "welcome-to-pinnboxio-blog",
  slug: "welcome-to-pinnboxio-blog",
  title: "Welcome to the PinnboxIO Blog",
  excerpt:
    "Product updates, productivity deep-dives, and stories from the team building a calmer way to communicate.",
  coverImage: "/blog/about-hero.png",
  author: "PinnboxIO Team",
  publishedAt: "2026-05-01T00:00:00.000Z",
  tags: ["Announcements", "Product"],
  readingMinutes: 2,
  seoTitle: "Welcome to the PinnboxIO Blog",
  seoDescription:
    "Welcome to the PinnboxIO blog — product updates, productivity deep-dives, and stories from the team building a calmer inbox.",
  aiSummary:
    "An introduction to the PinnboxIO blog: what it covers, why it exists, and how every post is pre-rendered for speed and SEO.",
  bodyHtml,
};

export const fallbackPosts: BlogPostDetail[] = [welcomePost];
