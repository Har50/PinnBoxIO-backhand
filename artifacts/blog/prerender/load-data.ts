import type { BlogData, BlogPostDetail, BlogTag } from "./types";
import { fallbackPosts } from "./welcome-post";
import { fetchFromNotion, notionConfigured } from "./notion";

function buildTags(posts: BlogPostDetail[]): BlogTag[] {
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

export async function loadBlogData(): Promise<BlogData> {
  let posts: BlogPostDetail[] = fallbackPosts;

  if (notionConfigured()) {
    try {
      const notionPosts = await fetchFromNotion();
      if (notionPosts.length > 0) {
        posts = notionPosts;
        console.log(`[prerender] Loaded ${posts.length} post(s) from Notion.`);
      } else {
        console.warn(
          "[prerender] Notion returned no published posts — using bundled fallback.",
        );
      }
    } catch (err) {
      console.warn(
        `[prerender] Notion fetch failed (${String(err)}) — using bundled fallback.`,
      );
    }
  } else {
    console.log(
      "[prerender] Notion not configured — using bundled fallback content.",
    );
  }

  return { posts, tags: buildTags(posts) };
}
